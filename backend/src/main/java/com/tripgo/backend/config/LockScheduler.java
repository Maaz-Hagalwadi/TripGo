package com.tripgo.backend.config;

import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Instant;

@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class LockScheduler {

    private final SeatLockService lockService;
    private final RouteScheduleRepository scheduleRepository;

    @Scheduled(fixedRate = 60_000)
    public void cleanup() {
        lockService.cleanupExpired();
    }

    @Scheduled(fixedRate = 60_000)
    public void autoCompleteSchedules() {
        scheduleRepository.findPastUncompletedSchedules(Instant.now())
                .forEach(schedule -> {
                    schedule.setTripStatus("COMPLETED");
                    scheduleRepository.save(schedule);
                });
    }
}

