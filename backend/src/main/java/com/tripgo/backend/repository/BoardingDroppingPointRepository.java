package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.BoardingDroppingPoint;
import com.tripgo.backend.model.entities.RouteSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BoardingDroppingPointRepository extends JpaRepository<BoardingDroppingPoint, UUID> {
    List<BoardingDroppingPoint> findByScheduleOrderByTypeAscArrivalTimeAsc(RouteSchedule schedule);

    @Query("""
        SELECT DISTINCT p FROM BoardingDroppingPoint p
        WHERE p.schedule.route.id = :routeId
        ORDER BY p.type ASC, p.arrivalTime ASC
    """)
    List<BoardingDroppingPoint> findByRouteId(@Param("routeId") UUID routeId);
}
