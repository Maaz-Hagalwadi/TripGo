package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Driver;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DriverRepository extends JpaRepository<Driver, UUID> {
}