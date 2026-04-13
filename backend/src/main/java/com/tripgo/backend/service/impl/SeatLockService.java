package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.RouteSegment;
import com.tripgo.backend.model.entities.SeatLock;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.RouteSegmentRepository;
import com.tripgo.backend.repository.SeatLockRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SeatLockService {

    private final SeatLockRepository seatLockRepo;
    private final RouteSegmentRepository segmentRepo;

    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    public UUID lockSeats(RouteSchedule schedule, List<String> seatNumbers, User user, LocalDate travelDate, String fromStop, String toStop) {

        UUID token = UUID.randomUUID();
        Instant expiry = Instant.now().plus(LOCK_DURATION);
        List<RouteSegment> segments = segmentRepo.findByRouteOrderBySeq(schedule.getRoute());
        String resolvedFrom = normalizeFromStop(segments, fromStop);
        String resolvedTo = normalizeToStop(segments, toStop);
        List<SeatLock> activeLocks = seatLockRepo.findByRouteScheduleIdAndTravelDate(schedule.getId(), travelDate)
                .stream()
                .filter(lock -> lock.getExpiresAt().isAfter(Instant.now()))
                .toList();

        for (String seatNumber : seatNumbers) {

            boolean alreadyLocked = activeLocks.stream()
                    .filter(lock -> seatNumber.equalsIgnoreCase(lock.getSeatNumber()))
                    .anyMatch(lock -> segmentsOverlap(segments, lock.getFromStop(), lock.getToStop(), resolvedFrom, resolvedTo));
            
            if (alreadyLocked) {
                throw new RuntimeException("Seat " + seatNumber + " is locked");
            }

            seatLockRepo.save(
                    SeatLock.builder()
                            .routeSchedule(schedule)
                            .seatNumber(seatNumber)
                            .travelDate(travelDate)
                            .fromStop(resolvedFrom)
                            .toStop(resolvedTo)
                            .lockedBy(user)
                            .expiresAt(expiry)
                            .lockToken(token)
                            .build()
            );
        }

        return token;
    }

    @Transactional
    public void release(UUID token) {
        seatLockRepo.deleteAll(
                seatLockRepo.findAll().stream()
                        .filter(l -> l.getLockToken().equals(token))
                        .toList()
        );
    }

    @Transactional
    public void cleanupExpired() {
        seatLockRepo.deleteExpired();
    }

    private String normalizeFromStop(List<RouteSegment> segments, String fromStop) {
        if (fromStop != null && !fromStop.isBlank()) return fromStop;
        if (!segments.isEmpty()) return segments.get(0).getFromStop();
        return "";
    }

    private String normalizeToStop(List<RouteSegment> segments, String toStop) {
        if (toStop != null && !toStop.isBlank()) return toStop;
        if (!segments.isEmpty()) return segments.get(segments.size() - 1).getToStop();
        return "";
    }

    private boolean segmentsOverlap(List<RouteSegment> segments, String bookedFrom, String bookedTo, String reqFrom, String reqTo) {
        int bookedStart = indexOf(segments, bookedFrom);
        int bookedEnd = indexOf(segments, bookedTo);
        int reqStart = indexOf(segments, reqFrom);
        int reqEnd = indexOf(segments, reqTo);
        if (bookedStart == -1 || bookedEnd == -1 || reqStart == -1 || reqEnd == -1) return true;
        return bookedStart < reqEnd && bookedEnd > reqStart;
    }

    private int indexOf(List<RouteSegment> segments, String stop) {
        for (int i = 0; i < segments.size(); i++) {
            if (segments.get(i).getFromStop().equalsIgnoreCase(stop)) return i;
        }
        for (int i = 0; i < segments.size(); i++) {
            if (segments.get(i).getToStop().equalsIgnoreCase(stop)) return i + 1;
        }
        return -1;
    }
}
