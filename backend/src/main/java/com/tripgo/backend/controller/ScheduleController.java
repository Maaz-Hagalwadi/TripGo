package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.RouteScheduleResponse;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/operator/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final RouteService routeService;

    @GetMapping
    public List<RouteScheduleResponse> listSchedules(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.listSchedules(user);
    }

    @GetMapping("/{scheduleId}")
    public RouteScheduleResponse getSchedule(@PathVariable UUID scheduleId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.getSchedule(scheduleId, user);
    }

    @DeleteMapping("/{scheduleId}")
    public void deleteSchedule(@PathVariable UUID scheduleId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        routeService.deleteSchedule(scheduleId, user);
    }
}
