package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RouteRepository extends JpaRepository<Route, UUID> {
    List<Route> findByOperator(Operator operator);
    Optional<Route> findByOperatorAndOriginAndDestination(Operator operator, String origin, String destination);

    @Query(value = """
        SELECT city
        FROM (
            SELECT DISTINCT TRIM(r.origin) AS city
            FROM routes r
            WHERE r.origin IS NOT NULL AND TRIM(r.origin) <> ''
            UNION
            SELECT DISTINCT TRIM(r.destination) AS city
            FROM routes r
            WHERE r.destination IS NOT NULL AND TRIM(r.destination) <> ''
            UNION
            SELECT DISTINCT TRIM(rs.from_stop) AS city
            FROM route_segments rs
            WHERE rs.from_stop IS NOT NULL AND TRIM(rs.from_stop) <> ''
            UNION
            SELECT DISTINCT TRIM(rs.to_stop) AS city
            FROM route_segments rs
            WHERE rs.to_stop IS NOT NULL AND TRIM(rs.to_stop) <> ''
        ) all_cities
        ORDER BY city
        """, nativeQuery = true)
    List<String> findAllDistinctCities();
}
