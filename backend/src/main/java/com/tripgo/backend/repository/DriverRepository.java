package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Driver;
import com.tripgo.backend.model.entities.Operator;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DriverRepository extends JpaRepository<Driver, UUID> {
    List<Driver> findByOperator(Operator operator);
    boolean existsByLicenseNumberAndOperator(String licenseNumber, Operator operator);
}