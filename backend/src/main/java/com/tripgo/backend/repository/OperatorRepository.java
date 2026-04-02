package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.enums.OperatorStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OperatorRepository extends JpaRepository<Operator, UUID> {
    List<Operator> findByStatus(OperatorStatus status);
}