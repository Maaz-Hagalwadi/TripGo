package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Operator;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OperatorRepository extends JpaRepository<Operator, UUID> {
}