package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.repository.RouteScheduleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Completes finished schedules and, for DAILY buses, creates the next upcoming departure.
 * Safe to run concurrently (several threads or app instances): each schedule is claimed atomically,
 * an existing next departure is never recreated, and a unique index (V55) backs this up in the DB.
 */
@Slf4j
@Service
public class ScheduleRolloverService {

    private final RouteScheduleRepository scheduleRepository;
    private final ReferralService referralService;

    public ScheduleRolloverService(RouteScheduleRepository scheduleRepository,
                                   @Lazy ReferralService referralService) {
        this.scheduleRepository = scheduleRepository;
        this.referralService = referralService;
    }

    @Transactional
    public void completeAndRollOver(UUID scheduleId, Instant now) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId).orElse(null);
        if (schedule == null) return;
        boolean wasActive = Boolean.TRUE.equals(schedule.getActive());

        if (scheduleRepository.markCompletedIfOpen(scheduleId) == 0) return; // someone else got it

        // Fire referral rewards for first-timers on this completed trip
        try {
            referralService.onTripCompleted(scheduleId);
        } catch (Exception e) {
            log.warn("Referral reward processing failed for schedule {}: {}", scheduleId, e.getMessage());
        }

        // Inactive copies (e.g. deduplicated ones) are completed but never spawn another day
        if (!wasActive || !"DAILY".equalsIgnoreCase(schedule.getFrequency())) return;

        // Jump straight to the next departure whose trip hasn't finished yet — no day-by-day catch-up
        long daysAhead = Math.max(1, ChronoUnit.DAYS.between(schedule.getArrivalTime(), now) + 1);
        Instant nextDeparture = schedule.getDepartureTime().plus(daysAhead, ChronoUnit.DAYS);
        Duration tripLength = Duration.between(schedule.getDepartureTime(), schedule.getArrivalTime());

        if (scheduleRepository.existsByBusAndRouteAndDepartureTimeAndActiveTrue(
                schedule.getBus(), schedule.getRoute(), nextDeparture)) {
            return;
        }

        scheduleRepository.save(RouteSchedule.builder()
                .route(schedule.getRoute())
                .bus(schedule.getBus())
                .departureTime(nextDeparture)
                .arrivalTime(nextDeparture.plus(tripLength))
                .frequency(schedule.getFrequency())
                .active(true)
                .tripStatus("SCHEDULED")
                .build());
    }
}
