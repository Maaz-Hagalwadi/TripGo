package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.SeatLock;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.SeatLockRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SeatLockService {

    private final SeatLockRepository seatLockRepo;

    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    public UUID lockSeats(RouteSchedule schedule, List<String> seatNumbers, User user) {

        UUID token = UUID.randomUUID();
        Instant expiry = Instant.now().plus(LOCK_DURATION);

        for (String seatNumber : seatNumbers) {

            boolean alreadyLocked = seatLockRepo
                    .findByRouteScheduleIdAndSeatNumber(schedule.getId(), seatNumber)
                    .filter(lock -> lock.getExpiresAt().isAfter(Instant.now()))
                    .isPresent();

            if (alreadyLocked) {
                throw new RuntimeException("Seat " + seatNumber + " is locked");
            }

            seatLockRepo.save(
                    SeatLock.builder()
                            .routeSchedule(schedule)
                            .seatNumber(seatNumber)
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
}

