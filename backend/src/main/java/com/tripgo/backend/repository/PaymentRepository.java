package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByProviderTransactionId(String providerTransactionId);
    Optional<Payment> findTopByBookingOrderByCreatedAtDesc(Booking booking);
}