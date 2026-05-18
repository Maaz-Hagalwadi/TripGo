package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Passenger;
import com.tripgo.backend.model.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PassengerRepository extends JpaRepository<Passenger, UUID> {
    List<Passenger> findByUserOrderByCreatedAtDesc(User user);
    Optional<Passenger> findByIdAndUser(UUID id, User user);
}