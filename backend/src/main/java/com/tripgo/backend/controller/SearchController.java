package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.SearchResponse;
import com.tripgo.backend.dto.response.SeatAvailability;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.repository.RouteScheduleRepository;
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

    @GetMapping
    public List<SearchResponse> search(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam String date,
            @RequestParam(required = false) String seatType
    ) {
        System.out.println("🔍 Search request: from=" + from + ", to=" + to + ", date=" + date);
        
        LocalDate travelDate = LocalDate.parse(date);
        Instant startOfDay = travelDate.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        Instant endOfDay = travelDate.plusDays(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        
        System.out.println("📅 Date range: " + startOfDay + " to " + endOfDay);
        
        // Find all schedules for the route and date
        List<RouteSchedule> schedules = scheduleRepo.findByFromAndToAndDate(from, to, startOfDay, endOfDay);
        System.out.println("📋 Found " + schedules.size() + " schedules");
        
        // Get availability for each schedule
        List<SearchResponse> results = schedules.stream()
                .map(schedule -> {
                    System.out.println("🚌 Processing schedule: " + schedule.getId() + ", departure: " + schedule.getDepartureTime());
                    return availabilityService.search(schedule, from, to, seatType);
                })
                .filter(result -> hasAvailableSeats(result)) // Check if any seats are available
                .toList();
                
        System.out.println("✅ Returning " + results.size() + " results");
        return results;
    }
    
    private boolean hasAvailableSeats(SearchResponse response) {
        return response.seatAvailability().stream()
                .anyMatch(SeatAvailability::available);
    }
}

