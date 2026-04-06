package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.SchedulePolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SchedulePolicyRepository extends JpaRepository<SchedulePolicy, UUID> {
    Optional<SchedulePolicy> findByScheduleId(UUID scheduleId);
}
