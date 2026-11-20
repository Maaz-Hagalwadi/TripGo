package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.response.SearchResponse;
import com.tripgo.backend.model.entities.RouteAlert;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.repository.RouteAlertRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteAlertService {

    private final RouteAlertRepository alertRepository;
    private final RouteScheduleRepository scheduleRepo;
    private final AvailabilityService availabilityService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Transactional
    public void checkAlerts() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Instant cutoff = Instant.now().minus(24, ChronoUnit.HOURS);

        List<RouteAlert> alerts = alertRepository.findAlertsReadyToCheck(today, cutoff);

        for (RouteAlert alert : alerts) {
            try {
                // Atomically claim — if 0 rows updated another instance got here first
                int claimed = alertRepository.claimForNotification(
                        alert.getId().toString(), Instant.now().toString(), cutoff.toString());
                if (claimed == 0) continue;

                List<RouteSchedule> schedules = scheduleRepo.findByFromAndToAndDate(
                        alert.getFromStop(), alert.getToStop(),
                        alert.getTravelDate().atStartOfDay(ZoneOffset.UTC).toInstant(),
                        alert.getTravelDate().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()
                );

                boolean triggered = false;
                BigDecimal lowestFare = null;

                for (RouteSchedule schedule : schedules) {
                    SearchResponse result = availabilityService.search(schedule, alert.getFromStop(), alert.getToStop(), null);
                    if (result == null) continue;

                    if (alert.isAlertOnSeatAvailable() && result.availableSeats() > 0) {
                        triggered = true;
                    }

                    if (alert.getTargetFare() != null) {
                        BigDecimal minFare = result.faresByType().values().stream()
                                .map(f -> f.totalFare())
                                .filter(f -> f != null)
                                .min(BigDecimal::compareTo)
                                .orElse(null);
                        if (minFare != null) {
                            if (lowestFare == null || minFare.compareTo(lowestFare) < 0) lowestFare = minFare;
                            if (minFare.compareTo(alert.getTargetFare()) <= 0) triggered = true;
                        }
                    }
                }

                if (triggered) {
                    sendAlertNotification(alert, lowestFare, schedules.size());
                }

            } catch (Exception e) {
                log.warn("Alert check failed for alert {}: {}", alert.getId(), e.getMessage());
            }
        }
    }

    private void sendAlertNotification(RouteAlert alert, BigDecimal lowestFare, int busCount) {
        String message;
        if (lowestFare != null && alert.getTargetFare() != null
                && lowestFare.compareTo(alert.getTargetFare()) <= 0) {
            message = String.format("Fare alert: %s → %s on %s. Fares from ₹%.0f — book now!",
                    alert.getFromStop(), alert.getToStop(), alert.getTravelDate(), lowestFare);
        } else {
            message = String.format("Seats available: %s → %s on %s. %d bus(es) available — book now!",
                    alert.getFromStop(), alert.getToStop(), alert.getTravelDate(), busCount);
        }

        notificationService.send(alert.getUser(), "ROUTE_ALERT", "Trip Alert", message, "/search");
        emailService.sendRouteAlert(alert.getUser(), alert.getFromStop(), alert.getToStop(),
                alert.getTravelDate(), lowestFare, busCount);
    }
}
