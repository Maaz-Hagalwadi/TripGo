package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByRouteScheduleId(UUID scheduleId);
    List<Review> findByBusId(UUID busId);
    boolean existsByUserIdAndRouteScheduleId(UUID userId, UUID scheduleId);
    List<Review> findByUserId(UUID userId);
}
