
package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.SeatLock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SeatLockRepository extends JpaRepository<SeatLock, UUID> {
}