package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.BusDriverAssignment;
import com.tripgo.backend.model.entities.Driver;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BusDriverAssignmentRepository extends JpaRepository<BusDriverAssignment, UUID> {
    List<BusDriverAssignment> findByBus(Bus bus);
    List<BusDriverAssignment> findByDriver(Driver driver);
    Optional<BusDriverAssignment> findByBusAndAssignedToIsNull(Bus bus);
    Optional<BusDriverAssignment> findByDriverAndAssignedToIsNull(Driver driver);
}