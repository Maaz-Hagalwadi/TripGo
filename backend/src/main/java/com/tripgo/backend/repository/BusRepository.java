package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Bus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BusRepository extends JpaRepository<Bus, UUID> {
}