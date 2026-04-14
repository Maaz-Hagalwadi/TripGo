package com.tripgo.backend.config;

import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

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
                    schedule.setActive(false);
                    scheduleRepository.save(schedule);

                    if ("DAILY".equalsIgnoreCase(schedule.getFrequency())) {
                        RouteSchedule next = RouteSchedule.builder()
                                .route(schedule.getRoute())
                                .bus(schedule.getBus())
                                .departureTime(schedule.getDepartureTime().plus(1, ChronoUnit.DAYS))
                                .arrivalTime(schedule.getArrivalTime().plus(1, ChronoUnit.DAYS))
                                .frequency(schedule.getFrequency())
                                .active(true)
                                .tripStatus("SCHEDULED")
                                .build();
                        scheduleRepository.save(next);
                    }
                });
    }
}

