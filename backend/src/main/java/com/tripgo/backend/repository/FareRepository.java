package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Fare;
import com.tripgo.backend.model.entities.Route;
import com.tripgo.backend.model.entities.RouteSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FareRepository extends JpaRepository<Fare, UUID> {

    List<Fare> findByRouteOrderBySeatType(Route route);
    List<Fare> findByRouteSegment(RouteSegment segment);
    List<Fare> findByRouteSegmentId(UUID segmentId);

    // Route-level fare (bus_id IS NULL)
    Optional<Fare> findByRouteSegmentIdAndSeatTypeAndBusIsNull(UUID segmentId, String seatType);

    // Per-bus fare
    Optional<Fare> findByRouteSegmentIdAndSeatTypeAndBusId(UUID segmentId, String seatType, UUID busId);

    // All fares for a segment (both route-level and bus-level)
    List<Fare> findByRouteSegmentIdAndBusIsNull(UUID segmentId);
    List<Fare> findByRouteSegmentIdAndBusId(UUID segmentId, UUID busId);

    // Legacy - kept for backward compat (returns route-level fare)
    @Query("SELECT f FROM Fare f WHERE f.routeSegment.id = :segmentId AND f.seatType = :seatType AND f.bus IS NULL")
    Optional<Fare> findByRouteSegmentIdAndSeatType(@Param("segmentId") UUID segmentId, @Param("seatType") String seatType);
}
