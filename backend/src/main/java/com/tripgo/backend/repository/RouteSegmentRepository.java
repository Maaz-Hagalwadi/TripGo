package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Route;
import com.tripgo.backend.model.entities.RouteSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface RouteSegmentRepository extends JpaRepository<RouteSegment, UUID> {
    List<RouteSegment> findByRouteOrderBySeq(Route route);


}