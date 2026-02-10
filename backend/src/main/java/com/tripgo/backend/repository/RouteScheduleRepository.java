package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Route;
import com.tripgo.backend.model.entities.RouteSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RouteScheduleRepository extends JpaRepository<RouteSchedule, UUID> {
    List<RouteSchedule> findByRoute(Route route);
    
    @Query(value = """
        SELECT rs.* FROM route_schedules rs 
        JOIN routes r ON rs.route_id = r.id 
        WHERE LOWER(r.origin) = LOWER(:from) 
        AND LOWER(r.destination) = LOWER(:to) 
        AND rs.active = true
        AND (
            DATE(rs.departure_time) = :date
            OR (rs.frequency = 'DAILY' AND DATE(rs.departure_time) <= :date)
            OR (rs.frequency = 'WEEKDAYS' AND DATE(rs.departure_time) <= :date 
                AND EXTRACT(DOW FROM DATE(:date)) BETWEEN 1 AND 5)
            OR (rs.frequency = 'WEEKENDS' AND DATE(rs.departure_time) <= :date 
                AND EXTRACT(DOW FROM DATE(:date)) IN (0, 6))
        )
        """, nativeQuery = true)
    List<RouteSchedule> findByFromAndToAndDate(
        @Param("from") String from, 
        @Param("to") String to, 
        @Param("date") LocalDate date
    );
}