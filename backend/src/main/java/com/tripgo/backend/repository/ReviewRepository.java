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

    boolean existsByUserIdAndRouteScheduleIdAndTravelDate(UUID userId, UUID scheduleId, java.time.LocalDate travelDate);

    // Operator queries
    Page<Review> findByOperatorId(UUID operatorId, Pageable pageable);
    Page<Review> findByBusId(UUID busId, Pageable pageable);
    Page<Review> findByRouteScheduleId(UUID scheduleId, Pageable pageable);

    List<Review> findByBusId(UUID busId);
    List<Review> findByUserId(UUID userId);

    // Admin query - native SQL to avoid null parameter type issues
    @Query(value = """
        SELECT * FROM reviews r
        WHERE (:operatorId IS NULL OR r.operator_id = CAST(:operatorId AS uuid))
        AND (:busId IS NULL OR r.bus_id = CAST(:busId AS uuid))
        AND (:rating IS NULL OR r.rating = CAST(:rating AS integer))
        AND (:fromDate IS NULL OR r.created_at >= CAST(:fromDate AS timestamptz))
        AND (:toDate IS NULL OR r.created_at <= CAST(:toDate AS timestamptz))
        AND (:hidden IS NULL OR r.hidden = CAST(:hidden AS boolean))
        ORDER BY r.created_at DESC
        """,
        countQuery = """
        SELECT COUNT(*) FROM reviews r
        WHERE (:operatorId IS NULL OR r.operator_id = CAST(:operatorId AS uuid))
        AND (:busId IS NULL OR r.bus_id = CAST(:busId AS uuid))
        AND (:rating IS NULL OR r.rating = CAST(:rating AS integer))
        AND (:fromDate IS NULL OR r.created_at >= CAST(:fromDate AS timestamptz))
        AND (:toDate IS NULL OR r.created_at <= CAST(:toDate AS timestamptz))
        AND (:hidden IS NULL OR r.hidden = CAST(:hidden AS boolean))
        """,
        nativeQuery = true)
    Page<Review> findAllWithFilters(
            @Param("operatorId") String operatorId,
            @Param("busId") String busId,
            @Param("rating") Integer rating,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("hidden") Boolean hidden,
            Pageable pageable
    );
}
