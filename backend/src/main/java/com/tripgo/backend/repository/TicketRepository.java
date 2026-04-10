package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    Optional<Ticket> findByBooking(Booking booking);
}