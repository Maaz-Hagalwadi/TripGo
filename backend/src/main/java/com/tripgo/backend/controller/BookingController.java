package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/booking")
@RequiredArgsConstructor
public class BookingController {

    private final RouteScheduleRepository scheduleRepo;
    private final SeatLockService lockService;

    @PostMapping("/lock")
    public Map<String,Object> lock(
            @RequestParam UUID scheduleId,
            @RequestBody List<String> seatNumbers,
            Authentication auth
    ) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        UUID token = lockService.lockSeats(schedule, seatNumbers, user);

        return Map.of(
                "status", "LOCKED",
                "lockToken", token,
                "expiresInMinutes", 15
        );
    }

}

