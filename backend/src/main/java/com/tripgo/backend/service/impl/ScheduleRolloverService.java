package com.tripgo.backend.service.impl;

import com.tripgo.backend.config.AppTime;
import com.tripgo.backend.model.entities.BoardingDroppingPoint;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.SchedulePolicy;
import com.tripgo.backend.repository.BoardingDroppingPointRepository;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.repository.SchedulePolicyRepository;
import com.tripgo.backend.repository.SeatLockRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Completes finished schedules and, for recurring services, creates the next upcoming departure.
 * Safe to run concurrently (several threads or app instances): each schedule is claimed atomically,
 * an existing next departure is never recreated, and a unique index (V55) backs this up in the DB.
 */
@Slf4j
@Service
public class ScheduleRolloverService {

    private final RouteScheduleRepository scheduleRepository;
    private final ReferralService referralService;
    private final SchedulePolicyRepository policyRepository;
    private final BoardingDroppingPointRepository pointRepository;
    private final BookingRepository bookingRepository;
    private final SeatLockRepository seatLockRepository;

    public ScheduleRolloverService(RouteScheduleRepository scheduleRepository,
                                   @Lazy ReferralService referralService,
                                   SchedulePolicyRepository policyRepository,
                                   BoardingDroppingPointRepository pointRepository,
                                   BookingRepository bookingRepository,
                                   SeatLockRepository seatLockRepository) {
        this.scheduleRepository = scheduleRepository;
        this.referralService = referralService;
        this.policyRepository = policyRepository;
        this.pointRepository = pointRepository;
        this.bookingRepository = bookingRepository;
        this.seatLockRepository = seatLockRepository;
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
        String frequency = schedule.getFrequency() == null ? "ONCE" : schedule.getFrequency().toUpperCase();
        if (!wasActive || "ONCE".equals(frequency)) return;

        // Jump straight to the next running day whose trip hasn't finished yet — no day-by-day catch-up.
        // Weekday/weekend/weekly services used to stop after their first run (only DAILY rolled over).
        LocalDate runDate = schedule.getDepartureTime().atZone(AppTime.ZONE).toLocalDate();
        LocalTime departureTime = schedule.getDepartureTime().atZone(AppTime.ZONE).toLocalTime();
        Duration tripLength = Duration.between(schedule.getDepartureTime(), schedule.getArrivalTime());
        LocalDate nextDate = runDate.plusDays(1);
        for (int i = 0; i < 400 && (!runsOn(frequency, runDate, nextDate)
                || nextDate.atTime(departureTime).atZone(AppTime.ZONE).toInstant().plus(tripLength).isBefore(now)); i++) {
            nextDate = nextDate.plusDays(1);
        }
        Instant nextDeparture = nextDate.atTime(departureTime).atZone(AppTime.ZONE).toInstant();

        if (scheduleRepository.existsByBusAndRouteAndDepartureTimeAndActiveTrue(
                schedule.getBus(), schedule.getRoute(), nextDeparture)) {
            return;
        }

        RouteSchedule next = scheduleRepository.save(RouteSchedule.builder()
                .route(schedule.getRoute())
                .bus(schedule.getBus())
                .departureTime(nextDeparture)
                .arrivalTime(nextDeparture.plus(tripLength))
                .frequency(schedule.getFrequency())
                .active(true)
                .tripStatus("SCHEDULED")
                .build());
        copyTripSetup(schedule, next);

        // Travellers book later dates of a recurring service against the row that was current then.
        // Move those bookings and seat holds to the new row, or its seat map would show them as free.
        int moved = bookingRepository.moveToSchedule(schedule, next, nextDate);
        seatLockRepository.moveToSchedule(schedule, next, nextDate);
        if (moved > 0) log.info("Moved {} future bookings from schedule {} to {}", moved, scheduleId, next.getId());
    }

    /** Whether a recurring service whose first run was on {@code firstRun} also runs on {@code date}. */
    public static boolean runsOn(String frequency, LocalDate firstRun, LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return switch (frequency == null ? "ONCE" : frequency.toUpperCase()) {
            case "DAILY" -> true;
            case "WEEKDAYS" -> day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY;
            case "WEEKENDS" -> day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
            case "WEEKLY" -> day == firstRun.getDayOfWeek();
            default -> date.equals(firstRun);
        };
    }

    /**
     * Policies and boarding/dropping points belong to a schedule row, so each day's new departure must
     * inherit them — otherwise travellers saw no boarding points and default policies from day two on.
     */
    private void copyTripSetup(RouteSchedule from, RouteSchedule to) {
        policyRepository.findByScheduleId(from.getId()).ifPresent(p -> policyRepository.save(SchedulePolicy.builder()
                .schedule(to)
                .cancellationSlabs(copyRows(p.getCancellationSlabs()))
                .dateChangeAllowed(p.getDateChangeAllowed())
                .dateChangeFeePercent(p.getDateChangeFeePercent())
                .dateChangeMinHours(p.getDateChangeMinHours())
                .luggagePolicy(p.getLuggagePolicy())
                .childrenPolicy(p.getChildrenPolicy())
                .petsAllowed(p.getPetsAllowed())
                .liquorAllowed(p.getLiquorAllowed())
                .smokingAllowed(p.getSmokingAllowed())
                .pickupNotes(p.getPickupNotes())
                .restStops(copyRows(p.getRestStops()))
                .build()));

        List<BoardingDroppingPoint> points = pointRepository.findByScheduleOrderByTypeAscArrivalTimeAsc(from).stream()
                .map(pt -> BoardingDroppingPoint.builder()
                        .schedule(to)
                        .name(pt.getName())
                        .type(pt.getType())
                        .address(pt.getAddress())
                        .arrivalTime(pt.getArrivalTime())
                        .landmark(pt.getLandmark())
                        .build())
                .toList();
        if (!points.isEmpty()) pointRepository.saveAll(points);
    }

    private static List<Map<String, Object>> copyRows(List<Map<String, Object>> rows) {
        if (rows == null) return null;
        List<Map<String, Object>> copy = new ArrayList<>();
        rows.forEach(r -> copy.add(new HashMap<>(r)));
        return copy;
    }
}
