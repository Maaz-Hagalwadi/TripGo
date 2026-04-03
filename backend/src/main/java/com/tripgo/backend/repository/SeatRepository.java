package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface SeatRepository extends JpaRepository<Seat, UUID> {
    List<Seat> findByBus(Bus bus);

    @Modifying
    @Query("DELETE FROM Seat s WHERE s.bus = :bus")
    void deleteByBus(Bus bus);
}