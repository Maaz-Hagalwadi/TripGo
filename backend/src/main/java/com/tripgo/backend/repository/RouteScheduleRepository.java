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
    
    @Query("""
        SELECT rs FROM RouteSchedule rs 
        JOIN rs.route r 
        WHERE LOWER(r.origin) = LOWER(:from) 
        AND LOWER(r.destination) = LOWER(:to) 
        AND rs.departureTime >= :startOfDay 
        AND rs.departureTime < :endOfDay
        """)
    List<RouteSchedule> findByFromAndToAndDate(
        @Param("from") String from, 
        @Param("to") String to, 
        @Param("startOfDay") Instant startOfDay,
        @Param("endOfDay") Instant endOfDay
    );
}