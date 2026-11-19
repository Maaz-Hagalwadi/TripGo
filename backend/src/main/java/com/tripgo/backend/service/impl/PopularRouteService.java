package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.response.FareResult;
import com.tripgo.backend.dto.response.PopularRouteResponse;
import com.tripgo.backend.model.entities.Fare;
import com.tripgo.backend.model.entities.Route;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.RouteSegment;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.repository.RouteSegmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PopularRouteService {

    private final RouteScheduleRepository scheduleRepo;
    private final RouteSegmentRepository segmentRepo;
    private final SeatAvailabilityService seatAvailabilityService;

    /**
     * Origin → destination pairs that currently have bookable schedules, ranked by number of buses.
     * Routes from different operators with the same pair are merged.
     */
    @Transactional(readOnly = true)
    public List<PopularRouteResponse> getPopularRoutes(int limit) {
        Map<UUID, List<RouteSchedule>> schedulesByRoute = scheduleRepo.findBookableSchedules(Instant.now())
                .stream()
                .collect(Collectors.groupingBy(rs -> rs.getRoute().getId()));

        Map<String, Aggregate> byPair = new LinkedHashMap<>();

        schedulesByRoute.values().forEach(schedules -> {
            Route route = schedules.get(0).getRoute();
            List<RouteSegment> segments = segmentRepo.findByRouteOrderBySeq(route);
            if (segments.isEmpty()) return;

            String from = segments.get(0).getFromStop().trim();
            String to = segments.get(segments.size() - 1).getToStop().trim();
            Map<UUID, List<Fare>> fares = seatAvailabilityService.loadFaresBySegment(segments);

            Aggregate agg = byPair.computeIfAbsent(
                    (from + "|" + to).toLowerCase(), k -> new Aggregate(from, to));

            boolean allDurationsKnown = segments.stream().allMatch(s -> s.getDurationMinutes() != null);
            if (allDurationsKnown) {
                int minutes = segments.stream().mapToInt(RouteSegment::getDurationMinutes).sum();
                agg.durationMinutes = agg.durationMinutes == null ? minutes : Math.min(agg.durationMinutes, minutes);
            }

            for (RouteSchedule schedule : schedules) {
                UUID busId = schedule.getBus() != null ? schedule.getBus().getId() : null;
                if (busId != null) agg.busIds.add(busId);

                seatAvailabilityService.computeFaresByType(segments, busId, fares).values().stream()
                        .map(FareResult::totalFare)
                        .filter(Objects::nonNull)
                        .min(Comparator.naturalOrder())
                        .ifPresent(fare -> agg.startingFare = agg.startingFare == null ? fare : agg.startingFare.min(fare));
            }
        });

        return byPair.values().stream()
                .filter(a -> !a.busIds.isEmpty())
                .sorted(Comparator.comparingInt((Aggregate a) -> a.busIds.size()).reversed()
                        .thenComparing(a -> a.from, String.CASE_INSENSITIVE_ORDER))
                .limit(limit)
                .map(a -> new PopularRouteResponse(a.from, a.to, a.busIds.size(), a.durationMinutes, a.startingFare))
                .toList();
    }

    private static final class Aggregate {
        final String from;
        final String to;
        final Set<UUID> busIds = new HashSet<>();
        Integer durationMinutes;
        BigDecimal startingFare;

        Aggregate(String from, String to) {
            this.from = from;
            this.to = to;
        }
    }
}
