package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.BookingSeat;
import com.tripgo.backend.model.entities.RouteSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, UUID> {
    
    @Query("SELECT bs FROM BookingSeat bs WHERE bs.booking.routeSchedule = :schedule")
    List<BookingSeat> findByRouteSchedule(@Param("schedule") RouteSchedule schedule);
}