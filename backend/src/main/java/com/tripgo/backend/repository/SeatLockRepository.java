
package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.SeatLock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface SeatLockRepository extends JpaRepository<SeatLock, UUID> {

    List<SeatLock> findByRouteScheduleIdAndTravelDate(UUID scheduleId, LocalDate travelDate);

    /**
     * Row-locks one checkout's seat locks until the transaction ends. Concurrent create-intent calls for
     * the same checkout therefore run one after another, so the second reuses the first's booking.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT sl FROM SeatLock sl WHERE sl.lockToken = :token")
    List<SeatLock> findByLockTokenForUpdate(@Param("token") UUID token);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.lockToken = :token")
    void deleteByLockToken(UUID token);

    @Modifying
    @Query("UPDATE SeatLock sl SET sl.routeSchedule = :to WHERE sl.routeSchedule = :from AND sl.travelDate >= :fromDate")
    int moveToSchedule(@Param("from") com.tripgo.backend.model.entities.RouteSchedule from,
                       @Param("to") com.tripgo.backend.model.entities.RouteSchedule to,
                       @Param("fromDate") LocalDate fromDate);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.expiresAt < CURRENT_TIMESTAMP")
    void deleteExpired();
}
