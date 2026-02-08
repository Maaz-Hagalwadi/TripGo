package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Operator;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BusRepository extends JpaRepository<Bus, UUID> {
    List<Bus> findByOperator(Operator operator);

    List<Bus> findByOperatorAndActiveTrue(Operator operator);
    
    List<Bus> findByOperatorAndActiveFalse(Operator operator);
}