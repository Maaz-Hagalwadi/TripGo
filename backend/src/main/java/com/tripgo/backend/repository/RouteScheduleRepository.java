package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Route;
import com.tripgo.backend.model.entities.RouteSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface RouteScheduleRepository extends JpaRepository<RouteSchedule, UUID> {

    List<RouteSchedule> findByRoute(Route route);

    @Query("""
        SELECT rs FROM RouteSchedule rs 
        JOIN rs.route r 
        WHERE LOWER(r.origin) = LOWER(:from) 
        AND LOWER(r.destination) = LOWER(:to) 
        AND rs.active = true
        AND (rs.frequency IS NOT NULL
             OR (rs.departureTime >= :startOfDay AND rs.departureTime < :endOfDay))
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
        AND rs.frequency IS NULL
        """)
    List<RouteSchedule> findPastUncompletedSchedules(@Param("now") Instant now);
}
