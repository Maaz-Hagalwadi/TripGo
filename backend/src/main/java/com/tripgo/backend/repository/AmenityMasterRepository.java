package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.AmenityMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AmenityMasterRepository extends JpaRepository<AmenityMaster, UUID> {
}