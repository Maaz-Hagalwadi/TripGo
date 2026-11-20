package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.RouteAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RouteAlertRepository extends JpaRepository<RouteAlert, UUID> {

    List<RouteAlert> findByUserIdAndActiveTrue(UUID userId);

    @Query("""
        SELECT a FROM RouteAlert a
        JOIN FETCH a.user
        WHERE a.active = true
        AND a.travelDate >= :today
        AND (a.lastNotifiedAt IS NULL OR a.lastNotifiedAt < :cutoff)
        """)
    List<RouteAlert> findAlertsReadyToCheck(@Param("today") LocalDate today, @Param("cutoff") Instant cutoff);

    // Atomically claims an alert for notification — prevents duplicate notifications across instances
    @Modifying
    @Transactional
    @Query(value = """
        UPDATE route_alerts
        SET last_notified_at = CAST(:now AS timestamptz)
        WHERE id = CAST(:id AS uuid)
          AND (last_notified_at IS NULL OR last_notified_at < CAST(:cutoff AS timestamptz))
        """, nativeQuery = true)
    int claimForNotification(@Param("id") String id, @Param("now") String now, @Param("cutoff") String cutoff);
}
