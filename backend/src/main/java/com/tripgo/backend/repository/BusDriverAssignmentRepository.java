package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.BusDriverAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BusDriverAssignmentRepository extends JpaRepository<BusDriverAssignment, UUID> {
}