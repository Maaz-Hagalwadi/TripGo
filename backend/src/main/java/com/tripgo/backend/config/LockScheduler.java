package com.tripgo.backend.config;

import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class LockScheduler {

    private final SeatLockService lockService;

    @Scheduled(fixedRate = 60_000) // every 1 minute
    public void cleanup() {
        lockService.cleanupExpired();
    }
}

