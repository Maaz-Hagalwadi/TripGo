package com.tripgo.backend.controller;

import com.tripgo.backend.config.AppTime;

import com.tripgo.backend.dto.response.PopularRouteResponse;
import com.tripgo.backend.dto.response.SearchResponse;
import com.tripgo.backend.dto.response.SeatAvailability;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.repository.BoardingDroppingPointRepository;
import com.tripgo.backend.repository.RouteRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.repository.RouteSegmentRepository;
import com.tripgo.backend.service.impl.AvailabilityService;
import com.tripgo.backend.service.impl.PopularRouteService;
import com.tripgo.backend.service.impl.ScheduleRolloverService;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Slf4j
@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final RouteScheduleRepository scheduleRepo;
    private final AvailabilityService availabilityService;
    private final RouteSegmentRepository segmentRepo;
    private final RouteRepository routeRepository;
    private final PopularRouteService popularRouteService;
    private final BoardingDroppingPointRepository pointRepository;

    @GetMapping("/cities")
    public List<String> getCities() {
        return routeRepository.findAllDistinctCities();
    }

    @GetMapping("/routes")
    public List<Map<String, String>> getRoutes() {
        return routeRepository.findAllDistinctRoutePairs().stream()
                .map(row -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("from", String.valueOf(row[0]));
                    m.put("to", String.valueOf(row[1]));
                    return m;
                })
                .toList();
    }

    @GetMapping("/popular-routes")
    public List<PopularRouteResponse> getPopularRoutes(@RequestParam(defaultValue = "6") int limit) {
        return popularRouteService.getPopularRoutes(Math.max(1, Math.min(limit, 12)));
    }

    @GetMapping
    public List<SearchResponse> search(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam LocalDate date
    ) {
        // Normalize input - trim and capitalize first letter
        String normalizedFrom = normalizeStopName(from);
        String normalizedTo = normalizeStopName(to);
        
        List<RouteSchedule> schedules = scheduleRepo.findByFromAndToAndDate(
                normalizedFrom, normalizedTo,
                date.atStartOfDay(AppTime.ZONE).toInstant(),
                date.plusDays(1).atStartOfDay(AppTime.ZONE).toInstant()
        );
        
        LocalDate today = LocalDate.now(AppTime.ZONE);
        if (date.isBefore(today)) return List.of();
        Instant now = Instant.now();

        return schedules.stream()
                .filter(schedule -> isBookableOn(schedule, date))
                // Boarding and dropping points are mandatory: without them a traveller can't complete a booking
                .filter(schedule -> pointRepository.existsByScheduleAndType(schedule, "BOARDING")
                        && pointRepository.existsByScheduleAndType(schedule, "DROPPING"))
                .map(schedule -> {
                    Instant adjustedDeparture = adjustToDate(schedule.getDepartureTime(), date);
                    // Keep the trip duration: projecting the arrival onto the same date separately put
                    // overnight arrivals (e.g. 20:00 → 01:00) before the departure.
                    Instant adjustedArrival = adjustedDeparture.plus(
                            java.time.Duration.between(schedule.getDepartureTime(), schedule.getArrivalTime()));
                    if (adjustedDeparture.isBefore(now)) return null; // already left today

                    // Live trip state (delay, start time) belongs to the row's own run, not to other dates
                    boolean sameRun = isRunDate(schedule, date);

                    RouteSchedule adjustedSchedule = new RouteSchedule();
                    adjustedSchedule.setId(schedule.getId());
                    adjustedSchedule.setRoute(schedule.getRoute());
                    adjustedSchedule.setBus(schedule.getBus());
                    adjustedSchedule.setDepartureTime(adjustedDeparture);
                    adjustedSchedule.setArrivalTime(adjustedArrival);
                    adjustedSchedule.setFrequency(schedule.getFrequency());
                    adjustedSchedule.setActive(schedule.getActive());
                    adjustedSchedule.setTripStatus(sameRun ? schedule.getTripStatus() : "SCHEDULED");
                    adjustedSchedule.setDelayMinutes(sameRun ? schedule.getDelayMinutes() : null);
                    adjustedSchedule.setDelayReason(sameRun ? schedule.getDelayReason() : null);
                    adjustedSchedule.setActualDepartureTime(sameRun ? schedule.getActualDepartureTime() : null);
                    adjustedSchedule.setActualArrivalTime(sameRun ? schedule.getActualArrivalTime() : null);

                    try {
                        return availabilityService.search(adjustedSchedule, normalizedFrom, normalizedTo, null);
                    } catch (RuntimeException e) {
                        // e.g. a route with no fares for this stretch — skip that bus, don't fail the whole search
                        log.warn("Skipping schedule {} in search: {}", schedule.getId(), e.getMessage());
                        return null;
                    }
                })
                .filter(r -> r != null)
                .toList();
    }

    /**
     * A recurring schedule row stands for every running day from its current run onwards. A trip that
     * has started only closes its own day — it used to hide the bus from search on every date.
     */
    private boolean isBookableOn(RouteSchedule schedule, LocalDate date) {
        String status = schedule.getTripStatus() == null ? "SCHEDULED" : schedule.getTripStatus();
        if (schedule.getFrequency() == null || "ONCE".equalsIgnoreCase(schedule.getFrequency())) {
            return !"STARTED".equals(status);
        }
        LocalDate runDate = schedule.getDepartureTime().atZone(AppTime.ZONE).toLocalDate();
        if (date.isBefore(runDate)) return false;
        if (!ScheduleRolloverService.runsOn(schedule.getFrequency(), runDate, date)) return false;
        return !(date.equals(runDate) && "STARTED".equals(status));
    }

    private boolean isRunDate(RouteSchedule schedule, LocalDate date) {
        return schedule.getDepartureTime().atZone(AppTime.ZONE).toLocalDate().equals(date);
    }

    private String normalizeStopName(String stop) {
        if (stop == null || stop.isEmpty()) return stop;
        // Title-case each word: "new delhi" -> "New Delhi"
        return java.util.Arrays.stream(stop.trim().split("\\s+"))
                .map(w -> w.substring(0, 1).toUpperCase() + w.substring(1).toLowerCase())
                .collect(java.util.stream.Collectors.joining(" "));
    }
    
    private Instant adjustToDate(Instant originalTime, LocalDate targetDate) {
        java.time.LocalDateTime originalDateTime = java.time.LocalDateTime.ofInstant(originalTime, AppTime.ZONE);
        java.time.LocalTime timeOfDay = originalDateTime.toLocalTime();
        return targetDate.atTime(timeOfDay).atZone(AppTime.ZONE).toInstant();
    }
    
}

