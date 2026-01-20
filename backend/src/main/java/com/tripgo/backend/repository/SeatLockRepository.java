
package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.SeatLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SeatLockRepository extends JpaRepository<SeatLock, UUID> {

    List<SeatLock> findByRouteScheduleId(UUID scheduleId);

    Optional<SeatLock> findByRouteScheduleIdAndSeatNumber(UUID scheduleId, String seatNumber);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.expiresAt < CURRENT_TIMESTAMP")
    void deleteExpired();
}
