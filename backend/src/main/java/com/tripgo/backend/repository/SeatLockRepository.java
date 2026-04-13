
package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.SeatLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface SeatLockRepository extends JpaRepository<SeatLock, UUID> {

    List<SeatLock> findByRouteScheduleIdAndTravelDate(UUID scheduleId, LocalDate travelDate);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.expiresAt < CURRENT_TIMESTAMP")
    void deleteExpired();
}
