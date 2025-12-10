package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Discount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DiscountRepository extends JpaRepository<Discount, UUID> {
}