package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Fare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FareRepository extends JpaRepository<Fare, UUID> {
}