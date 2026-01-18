package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.Route;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RouteRepository extends JpaRepository<Route, UUID> {
    List<Route> findByOperator(Operator operator);
}