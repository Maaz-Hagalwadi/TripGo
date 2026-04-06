package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByOperator(Operator operator);
    List<Booking> findByOperatorAndStatus(Operator operator, BookingStatus status);
    List<Booking> findByRouteSchedule(RouteSchedule routeSchedule);
    List<Booking> findByRouteScheduleAndStatus(RouteSchedule routeSchedule, BookingStatus status);
    List<Booking> findByUserAndStatus(User user, BookingStatus status);
    List<Booking> findByUser(User user);

    @Query("SELECT COALESCE(SUM(b.payableAmount), 0) FROM Booking b WHERE b.operator = :operator AND b.status = 'CONFIRMED'")
    BigDecimal getTotalRevenueByOperator(@Param("operator") Operator operator);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.operator = :operator AND b.status = 'CONFIRMED'")
    long getTotalBookingsByOperator(@Param("operator") Operator operator);
}
