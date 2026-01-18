package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.SearchResponse;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.service.impl.AvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final RouteScheduleRepository scheduleRepo;
    private final AvailabilityService availabilityService;

    @GetMapping
    public SearchResponse search(
            @RequestParam UUID scheduleId,
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam String seatType
    ) {
        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        return availabilityService.search(schedule, from, to, seatType);
    }
}

