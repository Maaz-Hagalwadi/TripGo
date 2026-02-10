package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.SearchResponse;
import com.tripgo.backend.dto.response.SeatAvailability;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.repository.RouteSegmentRepository;
import com.tripgo.backend.service.impl.AvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final RouteScheduleRepository scheduleRepo;
    private final AvailabilityService availabilityService;
    private final RouteSegmentRepository segmentRepo;

    @GetMapping
    public List<SearchResponse> search(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam LocalDate date
    ) {
        // Normalize input - trim and capitalize first letter
        String normalizedFrom = normalizeStopName(from);
        String normalizedTo = normalizeStopName(to);
        
        System.out.println("🔍 Search request: " + from + " -> " + to + " (normalized: " + normalizedFrom + " -> " + normalizedTo + ")");
        
        List<RouteSchedule> schedules = scheduleRepo.findByFromAndToAndDate(normalizedFrom, normalizedTo, date);
        
        return schedules.stream()
                .map(schedule -> {
                    // Adjust departure time to the searched date
                    Instant adjustedDeparture = adjustToDate(schedule.getDepartureTime(), date);
                    Instant adjustedArrival = adjustToDate(schedule.getArrivalTime(), date);
                    
                    // Create a temporary schedule with adjusted times
                    RouteSchedule adjustedSchedule = new RouteSchedule();
                    adjustedSchedule.setId(schedule.getId());
                    adjustedSchedule.setRoute(schedule.getRoute());
                    adjustedSchedule.setBus(schedule.getBus());
                    adjustedSchedule.setDepartureTime(adjustedDeparture);
                    adjustedSchedule.setArrivalTime(adjustedArrival);
                    adjustedSchedule.setFrequency(schedule.getFrequency());
                    adjustedSchedule.setActive(schedule.getActive());
                    
                    return availabilityService.search(adjustedSchedule, normalizedFrom, normalizedTo, "SLEEPER");
                })
                .toList();
    }
    
    private String normalizeStopName(String stop) {
        if (stop == null || stop.isEmpty()) return stop;
        stop = stop.trim();
        // Capitalize first letter, lowercase rest
        return stop.substring(0, 1).toUpperCase() + stop.substring(1).toLowerCase();
    }
    
    private Instant adjustToDate(Instant originalTime, LocalDate targetDate) {
        java.time.LocalDateTime originalDateTime = java.time.LocalDateTime.ofInstant(originalTime, java.time.ZoneOffset.UTC);
        java.time.LocalTime timeOfDay = originalDateTime.toLocalTime();
        return targetDate.atTime(timeOfDay).toInstant(java.time.ZoneOffset.UTC);
    }
    
    @GetMapping("/debug")
    public List<String> debugSchedules() {
        return scheduleRepo.findAll().stream()
                .map(s -> "Route: " + s.getRoute().getOrigin() + " -> " + s.getRoute().getDestination() + 
                         ", Date: " + s.getDepartureTime() + ", Active: " + s.getActive())
                .toList();
    }
    
    @GetMapping("/debug/route")
    public List<String> debugByRoute(@RequestParam String from, @RequestParam String to) {
        List<RouteSchedule> all = scheduleRepo.findAll();
        System.out.println("Total schedules in DB: " + all.size());
        
        return all.stream()
                .filter(s -> s.getRoute().getOrigin().equalsIgnoreCase(from) && 
                            s.getRoute().getDestination().equalsIgnoreCase(to))
                .map(s -> "ID: " + s.getId() + 
                         ", Route: " + s.getRoute().getOrigin() + " -> " + s.getRoute().getDestination() + 
                         ", Departure: " + s.getDepartureTime() + 
                         ", Active: " + s.getActive())
                .toList();
    }
    
    @GetMapping("/debug/segments")
    public List<String> debugSegments(@RequestParam String from, @RequestParam String to) {
        // First find schedules
        List<RouteSchedule> schedules = scheduleRepo.findAll().stream()
                .filter(s -> s.getRoute().getOrigin().equalsIgnoreCase(from) && 
                            s.getRoute().getDestination().equalsIgnoreCase(to))
                .toList();
        
        if (schedules.isEmpty()) {
            return List.of("No schedules found for " + from + " -> " + to);
        }
        
        RouteSchedule schedule = schedules.get(0);
        List<String> result = new java.util.ArrayList<>();
        result.add("Route: " + schedule.getRoute().getOrigin() + " -> " + schedule.getRoute().getDestination());
        result.add("Route ID: " + schedule.getRoute().getId());
        
        // Get segments using repository
        List<com.tripgo.backend.model.entities.RouteSegment> segments = 
            segmentRepo.findByRouteOrderBySeq(schedule.getRoute());
        
        result.add("Total segments: " + segments.size());
        
        for (int i = 0; i < segments.size(); i++) {
            var seg = segments.get(i);
            result.add("Segment [" + i + "] seq=" + seg.getSeq() + ": fromStop='" + seg.getFromStop() + "' -> toStop='" + seg.getToStop() + "'");
        }
        return result;
    }
}

