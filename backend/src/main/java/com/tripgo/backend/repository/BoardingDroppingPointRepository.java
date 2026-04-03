package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.BoardingDroppingPoint;
import com.tripgo.backend.model.entities.RouteSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BoardingDroppingPointRepository extends JpaRepository<BoardingDroppingPoint, UUID> {
    List<BoardingDroppingPoint> findByScheduleOrderByTypeAscArrivalTimeAsc(RouteSchedule schedule);
}
