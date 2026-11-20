package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.TripShareToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TripShareTokenRepository extends JpaRepository<TripShareToken, UUID> {
    Optional<TripShareToken> findByToken(UUID token);
    Optional<TripShareToken> findTopByBookingIdOrderByCreatedAtDesc(UUID bookingId);
}
