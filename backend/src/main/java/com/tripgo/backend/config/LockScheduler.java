package com.tripgo.backend.config;

import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.repository.SiteVisitRepository;
import com.tripgo.backend.service.impl.BookingExpiryService;
import com.tripgo.backend.service.impl.RouteAlertService;
import com.tripgo.backend.service.impl.ScheduleRolloverService;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class LockScheduler {

    private final SeatLockService lockService;
    private final RouteScheduleRepository scheduleRepository;
    private final ScheduleRolloverService rolloverService;
    private final BookingExpiryService bookingExpiryService;
    private final RouteAlertService routeAlertService;
    private final SiteVisitRepository siteVisitRepository;

    @Scheduled(fixedRate = 60_000)
    public void cleanup() {
        lockService.cleanupExpired();
    }

    /** Unpaid bookings past their payment window → FAILED (frees the seats and clears "Payment pending"). */
    @Scheduled(fixedRate = 60_000)
    public void expireUnpaidBookings() {
        bookingExpiryService.expireStalePendingBookings();
    }

    @Scheduled(fixedRate = 1_800_000) // every 30 minutes
    public void checkRouteAlerts() {
        routeAlertService.checkAlerts();
    }

    @Scheduled(fixedRate = 86_400_000) // daily
    public void purgeOldVisits() {
        int deleted = siteVisitRepository.deleteOlderThan(Instant.now().minus(180, ChronoUnit.DAYS));
        if (deleted > 0) log.info("Purged {} site_visits older than 180 days", deleted);
    }

    @Scheduled(fixedRate = 60_000)
    public void autoCompleteSchedules() {
        Instant now = Instant.now();
        scheduleRepository.findPastUncompletedSchedules(now).forEach(schedule -> {
            try {
                rolloverService.completeAndRollOver(schedule.getId(), now);
            } catch (DataIntegrityViolationException e) {
                // Another instance created the same next departure (unique index) — nothing to do
                log.debug("Next departure for schedule {} already exists", schedule.getId());
            }
        });
    }
}
