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

    @Query("SELECT DISTINCT r.origin FROM Route r UNION SELECT DISTINCT r.destination FROM Route r ORDER BY 1")
    List<String> findAllDistinctCities();
}