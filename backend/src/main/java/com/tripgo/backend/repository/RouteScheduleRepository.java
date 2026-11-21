package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Route;
import com.tripgo.backend.model.entities.RouteSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface RouteScheduleRepository extends JpaRepository<RouteSchedule, UUID> {

    List<RouteSchedule> findByRoute(Route route);

    // Same bookability rules as findByFromAndToAndDate, without the stop/date filter
    @Query("""
        SELECT rs FROM RouteSchedule rs
        JOIN FETCH rs.route
        LEFT JOIN FETCH rs.bus
        WHERE rs.active = true
        AND rs.tripStatus NOT IN ('STARTED', 'COMPLETED', 'CANCELLED')
        AND (
            (rs.frequency IS NOT NULL AND rs.frequency != 'ONCE')
            OR rs.departureTime >= :now
        )
        """)
    List<RouteSchedule> findBookableSchedules(@Param("now") Instant now);

    @Query("""
        SELECT DISTINCT rs FROM RouteSchedule rs
        JOIN rs.route r
        JOIN r.segments seg1
        JOIN r.segments seg2
        WHERE LOWER(TRIM(seg1.fromStop)) = LOWER(TRIM(:from))
        AND LOWER(TRIM(seg2.toStop)) = LOWER(TRIM(:to))
        AND seg1.seq <= seg2.seq
        AND rs.active = true
        AND rs.tripStatus NOT IN ('COMPLETED', 'CANCELLED')
        AND (
            (rs.frequency IS NOT NULL AND rs.frequency != 'ONCE')
            OR (rs.tripStatus != 'STARTED' AND rs.departureTime >= :startOfDay AND rs.departureTime < :endOfDay)
        )
        """)
    List<RouteSchedule> findByFromAndToAndDate(
        @Param("from") String from,
        @Param("to") String to,
        @Param("startOfDay") Instant startOfDay,
        @Param("endOfDay") Instant endOfDay
    );

    @Query("""
        SELECT COUNT(rs) > 0 FROM RouteSchedule rs 
        WHERE rs.bus = :bus 
        AND rs.active = true
        AND rs.departureTime < :arrivalTime 
        AND rs.arrivalTime > :departureTime
        """)
    boolean existsOverlappingSchedule(
        @Param("bus") Bus bus,
        @Param("departureTime") Instant departureTime,
        @Param("arrivalTime") Instant arrivalTime
    );

    @Query("""
        SELECT rs FROM RouteSchedule rs
        WHERE rs.tripStatus NOT IN ('COMPLETED', 'CANCELLED')
        AND rs.arrivalTime < :now
        """)
    List<RouteSchedule> findPastUncompletedSchedules(@Param("now") Instant now);

    /**
     * Atomically claims a finished schedule: returns 1 for exactly one caller, 0 if another thread or
     * app instance already completed it. Guards the daily roll-over against creating duplicates.
     */
    @Modifying
    @Query("""
        UPDATE RouteSchedule rs SET rs.tripStatus = 'COMPLETED', rs.active = false
        WHERE rs.id = :id AND rs.tripStatus NOT IN ('COMPLETED', 'CANCELLED')
        """)
    int markCompletedIfOpen(@Param("id") UUID id);

    boolean existsByBusAndRouteAndDepartureTimeAndActiveTrue(Bus bus, Route route, Instant departureTime);

    boolean existsByBus(Bus bus);
}
