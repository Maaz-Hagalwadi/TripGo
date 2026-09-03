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

    @Query("SELECT b FROM Booking b WHERE b.user = :user AND b.routeSchedule.id = :scheduleId AND b.status = 'CONFIRMED' ORDER BY b.createdAt DESC")
    List<Booking> findConfirmedByUserAndSchedule(@Param("user") User user, @Param("scheduleId") UUID scheduleId);

    @Query("SELECT b FROM Booking b WHERE b.user = :user AND b.routeSchedule.id = :scheduleId AND b.status = 'PENDING' ORDER BY b.createdAt DESC")
    List<Booking> findPendingByUserAndSchedule(@Param("user") User user, @Param("scheduleId") UUID scheduleId);

    @Query("SELECT b FROM Booking b WHERE b.user = :user AND b.routeSchedule.id = :scheduleId AND b.travelDate = :travelDate AND b.status = 'PENDING' ORDER BY b.createdAt DESC")
    List<Booking> findPendingByUserAndScheduleAndTravelDate(@Param("user") User user, @Param("scheduleId") UUID scheduleId, @Param("travelDate") java.time.LocalDate travelDate);

    @Query("SELECT b FROM Booking b JOIN FETCH b.user WHERE b.travelDate = :date AND b.status = :status")
    List<Booking> findByTravelDateAndStatus(@Param("date") java.time.LocalDate date, @Param("status") BookingStatus status);

    @Query("SELECT COALESCE(SUM(b.payableAmount), 0) FROM Booking b WHERE b.operator = :operator AND b.status = 'CONFIRMED'")
    BigDecimal getTotalRevenueByOperator(@Param("operator") Operator operator);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.operator = :operator AND b.status = 'CONFIRMED'")
    long getTotalBookingsByOperator(@Param("operator") Operator operator);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.status = :status")
    long countByStatus(@Param("status") BookingStatus status);

    @Query("SELECT COALESCE(SUM(b.payableAmount), 0) FROM Booking b WHERE b.status = :status")
    BigDecimal sumPayableAmountByStatus(@Param("status") BookingStatus status);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.operator = :operator AND b.status = :status")
    long countByOperatorAndStatus(@Param("operator") Operator operator, @Param("status") BookingStatus status);

    @Query("SELECT b.createdAt, b.payableAmount FROM Booking b WHERE b.status = 'CONFIRMED' AND b.createdAt >= :since")
    List<Object[]> findConfirmedStatsForPeriod(@Param("since") java.time.Instant since);

    @Query("SELECT b.operator.name, COALESCE(SUM(b.payableAmount), 0) FROM Booking b WHERE b.status = 'CONFIRMED' GROUP BY b.operator.name ORDER BY SUM(b.payableAmount) DESC")
    List<Object[]> getRevenueGroupedByOperator();

    @Query("SELECT b.operator.name, COUNT(b) FROM Booking b WHERE b.status = 'CONFIRMED' GROUP BY b.operator.name ORDER BY COUNT(b) DESC")
    List<Object[]> getBookingsCountGroupedByOperator();

    @Query("SELECT b.routeSchedule.route.origin, b.routeSchedule.route.destination, COUNT(b) FROM Booking b WHERE b.status = 'CONFIRMED' GROUP BY b.routeSchedule.route.origin, b.routeSchedule.route.destination ORDER BY COUNT(b) DESC")
    List<Object[]> getTopRoutesByBookingCount();
}
