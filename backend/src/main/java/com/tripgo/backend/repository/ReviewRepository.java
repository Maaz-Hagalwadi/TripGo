package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    boolean existsByUserIdAndRouteScheduleId(UUID userId, UUID scheduleId);

    // Operator queries
    Page<Review> findByOperatorId(UUID operatorId, Pageable pageable);
    Page<Review> findByBusId(UUID busId, Pageable pageable);
    Page<Review> findByRouteScheduleId(UUID scheduleId, Pageable pageable);

    // Admin queries with filters
    @Query("""
        SELECT r FROM Review r
        WHERE (:operatorId IS NULL OR r.operator.id = :operatorId)
        AND (:busId IS NULL OR r.bus.id = :busId)
        AND (:rating IS NULL OR r.rating = :rating)
        AND (:from IS NULL OR r.createdAt >= :from)
        AND (:to IS NULL OR r.createdAt <= :to)
        AND (:hidden IS NULL OR r.hidden = :hidden)
    """)
    Page<Review> findAllWithFilters(
            @Param("operatorId") UUID operatorId,
            @Param("busId") UUID busId,
            @Param("rating") Integer rating,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("hidden") Boolean hidden,
            Pageable pageable
    );

    List<Review> findByBusId(UUID busId);
    List<Review> findByUserId(UUID userId);
}
