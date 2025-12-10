package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SeatRepository extends JpaRepository<Seat, UUID> {
}