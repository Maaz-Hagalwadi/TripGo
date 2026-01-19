package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Fare;
import com.tripgo.backend.model.entities.Route;
import com.tripgo.backend.model.entities.RouteSegment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FareRepository extends JpaRepository<Fare, UUID> {
    List<Fare> findByRouteOrderBySeatType(Route route);

    List<Fare> findByRouteSegment(RouteSegment segment);

    Optional<Fare> findByRouteSegmentIdAndSeatType(UUID segmentId, String seatType);
}