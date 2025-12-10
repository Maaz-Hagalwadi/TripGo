package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.RouteSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RouteScheduleRepository extends JpaRepository<RouteSchedule, UUID> {
}