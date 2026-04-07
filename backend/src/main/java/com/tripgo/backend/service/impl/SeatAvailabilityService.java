package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.response.FareResult;
import com.tripgo.backend.dto.response.SeatAvailability;
import com.tripgo.backend.dto.response.SearchResult;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeatAvailabilityService {

    private final RouteSegmentRepository segmentRepo;
    private final FareRepository fareRepo;
    private final SeatRepository seatRepo;
    private final BookingSeatRepository bookingSeatRepo;

    public SearchResult searchAvailability(RouteSchedule schedule, String from, String to, String seatType) {

        List<RouteSegment> segments = segmentRepo.findByRouteOrderBySeq(schedule.getRoute());

        int startIdx = indexOf(segments, from);
        int endIdx = indexOf(segments, to);

        if (startIdx == -1 || endIdx == -1 || endIdx <= startIdx) {
            throw new RuntimeException("Invalid stop selection: Could not find '" + from + "' or '" + to + "' in route segments");
        }

        List<RouteSegment> travelSegments = segments.subList(startIdx, endIdx);

        System.out.println("🔍 Travel segments (" + travelSegments.size() + "):");
        for (RouteSegment seg : travelSegments) {
            List<Fare> fares = fareRepo.findByRouteSegmentId(seg.getId());
            System.out.println("  Segment: " + seg.getFromStop() + " -> " + seg.getToStop() + " | id=" + seg.getId() + " | fares=" + fares.size());
            for (Fare f : fares) System.out.println("    Fare: seatType=" + f.getSeatType() + " base=" + f.getBaseFare());
        }

        // Build fare map: seatType -> FareResult
        // Priority: bus-specific fare > route-level fare
        UUID busId = schedule.getBus() != null ? schedule.getBus().getId() : null;

        // Collect all seat types: bus-specific first, then route-level
        Set<String> seatTypes = new java.util.LinkedHashSet<>();
        for (RouteSegment seg : travelSegments) {
            List<Fare> busFares = busId != null
                    ? fareRepo.findByRouteSegmentIdAndBusId(seg.getId(), busId)
                    : List.of();
            List<Fare> routeFares = fareRepo.findByRouteSegmentIdAndBusIsNull(seg.getId());
            // Also get ALL fares for this segment as final fallback
            List<Fare> allFares = fareRepo.findByRouteSegmentId(seg.getId());
            System.out.println("💰 Segment " + seg.getFromStop() + "->" + seg.getToStop()
                    + " | busFares=" + busFares.size()
                    + " | routeFares=" + routeFares.size()
                    + " | allFares=" + allFares.size());
            busFares.stream().map(Fare::getSeatType).filter(t -> t != null && !t.isBlank()).forEach(seatTypes::add);
            routeFares.stream().map(Fare::getSeatType).filter(t -> t != null && !t.isBlank()).forEach(seatTypes::add);
            // Fallback: if still empty, use all fares
            if (seatTypes.isEmpty()) {
                allFares.stream().map(Fare::getSeatType).filter(t -> t != null && !t.isBlank()).forEach(seatTypes::add);
            }
        }
        System.out.println("🎫 Seat types found: " + seatTypes);

        Map<String, FareResult> faresByType = new java.util.LinkedHashMap<>();
        for (String type : seatTypes) {
            BigDecimal base = BigDecimal.ZERO;
            BigDecimal gst = BigDecimal.ZERO;
            boolean complete = true;
            for (RouteSegment seg : travelSegments) {
                // Try bus-specific fare first, then route-level, then any fare
                Optional<Fare> fare = busId != null
                        ? fareRepo.findByRouteSegmentIdAndSeatTypeAndBusId(seg.getId(), type, busId)
                        : Optional.empty();
                if (fare.isEmpty()) {
                    fare = fareRepo.findByRouteSegmentIdAndSeatType(seg.getId(), type);
                }
                if (fare.isEmpty()) {
                    // Final fallback: any fare for this segment and seat type
                    fare = fareRepo.findByRouteSegmentId(seg.getId()).stream()
                            .filter(f -> type.equals(f.getSeatType()))
                            .findFirst();
                }
                if (fare.isEmpty()) { complete = false; break; }
                base = base.add(fare.get().getBaseFare());
                gst = gst.add(fare.get().getBaseFare()
                        .multiply(fare.get().getGstPercent())
                        .divide(BigDecimal.valueOf(100)));
            }
            if (complete) faresByType.put(type, new FareResult(base, gst, base.add(gst)));
        }

        if (faresByType.isEmpty()) {
            throw new RuntimeException("No fares defined for route: " + from + " -> " + to);
        }

        // Seat availability
        List<Seat> seats = seatRepo.findByBus(schedule.getBus());
        List<SeatAvailability> seatAvailability = seats.stream()
                .map(seat -> new SeatAvailability(seat.getSeatNumber(), true))
                .toList();

        return new SearchResult(faresByType, seatAvailability);
    }

    private int indexOf(List<RouteSegment> segs, String stop) {
        // Check if stop is a fromStop
        for (int i = 0; i < segs.size(); i++) {
            if (segs.get(i).getFromStop().equalsIgnoreCase(stop)) {
                return i;
            }
        }
        
        // Check if stop is a toStop (for destination)
        for (int i = 0; i < segs.size(); i++) {
            if (segs.get(i).getToStop().equalsIgnoreCase(stop)) {
                return i + 1; // Return next index for destination
            }
        }
        
        return -1;
    }
}