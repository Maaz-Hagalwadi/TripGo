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
            @RequestParam LocalDate date
    ) {
        List<RouteSchedule> schedules = scheduleRepo.findByFromAndToAndDate(from, to, date);
        
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
                    
                    return availabilityService.search(adjustedSchedule, from, to, "SLEEPER");
                })
                .toList();
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
}

