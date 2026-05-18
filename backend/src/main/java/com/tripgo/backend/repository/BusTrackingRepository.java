package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.BusTracking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BusTrackingRepository extends JpaRepository<BusTracking, UUID> {
    Optional<BusTracking> findTopByRouteScheduleIdOrderByRecordedAtDesc(UUID scheduleId);
}