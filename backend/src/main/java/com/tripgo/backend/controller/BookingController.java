package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.BoardingDroppingPointResponse;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/booking")
@RequiredArgsConstructor
public class BookingController {

    private final RouteScheduleRepository scheduleRepo;
    private final SeatLockRepository lockRepo;
    private final SeatLockService lockService;
    private final SeatRepository seatRepository;
    private final BoardingDroppingPointRepository pointRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final RouteSegmentRepository routeSegmentRepository;
    private final PaymentRepository paymentRepository;

    // ─── GET seats for schedule ───────────────────────────────────────────────
    @GetMapping("/schedules/{scheduleId}/seats")
    public ResponseEntity<?> getSeatsForSchedule(
            @PathVariable UUID scheduleId,
            @RequestParam(required = false) String travelDate,
            @RequestParam(name = "date", required = false) String date,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        LocalDate resolvedDate = resolveTravelDate(schedule, travelDate, date);
        List<RouteSegment> segments = routeSegmentRepository.findByRouteOrderBySeq(schedule.getRoute());
        String resolvedFrom = normalizeFromStop(segments, from);
        String resolvedTo = normalizeToStop(segments, to);
        List<SeatLock> activeLocks = lockRepo.findByRouteScheduleIdAndTravelDate(scheduleId, resolvedDate).stream()
                .filter(lock -> lock.getExpiresAt().isAfter(Instant.now()))
                .toList();
        List<BookingSeat> confirmedSeats = bookingSeatRepository.findByRouteSchedule(schedule).stream()
                .filter(bs -> bs.getBooking().getStatus() == com.tripgo.backend.model.enums.BookingStatus.CONFIRMED)
                .filter(bs -> resolvedDate.equals(bs.getBooking().getTravelDate()))
                .toList();

        List<Seat> seats = seatRepository.findByBus(schedule.getBus());

        List<Map<String, Object>> seatDTOs = seats.stream().map(seat -> {
            boolean isLocked = activeLocks.stream()
                    .filter(lock -> seat.getSeatNumber().equalsIgnoreCase(lock.getSeatNumber()))
                    .anyMatch(lock -> segmentsOverlap(segments, lock.getFromStop(), lock.getToStop(), resolvedFrom, resolvedTo));

            boolean isBooked = confirmedSeats.stream()
                    .filter(bs -> seat.getSeatNumber().equalsIgnoreCase(bs.getSeatNumber()))
                    .anyMatch(bs -> segmentsOverlap(segments, bs.getFromStop(), bs.getToStop(), resolvedFrom, resolvedTo));

            return Map.<String, Object>of(
                    "id", seat.getId(),
                    "seatNumber", seat.getSeatNumber(),
                    "seatType", seat.getSeatType(),
                    "isLadiesOnly", Boolean.TRUE.equals(seat.getIsLadiesOnly()),
                    "isWindow", Boolean.TRUE.equals(seat.getIsWindow()),
                    "isAisle", Boolean.TRUE.equals(seat.getIsAisle()),
                    "isBlocked", Boolean.TRUE.equals(seat.getIsBlocked()),
                    "available", !isLocked && !isBooked && !Boolean.TRUE.equals(seat.getIsBlocked())
            );
        }).toList();

        boolean isSeater = seats.stream().noneMatch(s -> s.getSeatNumber().startsWith("U"));

        if (isSeater) {
            return ResponseEntity.ok(Map.of("deck", "lower", "seats", seatDTOs));
        }

        return ResponseEntity.ok(Map.of(
                "upperDeck", seatDTOs.stream().filter(s -> s.get("seatNumber").toString().startsWith("U")).toList(),
                "lowerDeck", seatDTOs.stream().filter(s -> s.get("seatNumber").toString().startsWith("L")).toList()
        ));
    }

    // ─── GET boarding/dropping points ─────────────────────────────────────────
    @GetMapping("/schedules/{scheduleId}/points")
    public ResponseEntity<?> getBoardingDroppingPoints(@PathVariable UUID scheduleId) {
        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        List<BoardingDroppingPointResponse> points = pointRepository
                .findByScheduleOrderByTypeAscArrivalTimeAsc(schedule)
                .stream()
                .map(BoardingDroppingPointResponse::from)
                .toList();

        return ResponseEntity.ok(Map.of(
                "boardingPoints", points.stream().filter(p -> "BOARDING".equals(p.type())).toList(),
                "droppingPoints", points.stream().filter(p -> "DROPPING".equals(p.type())).toList()
        ));
    }

    // ─── POST lock seats ──────────────────────────────────────────────────────
    @PostMapping("/lock")
    public Map<String, Object> lock(
            @RequestParam UUID scheduleId,
            @RequestParam(required = false) String travelDate,
            @RequestParam(name = "date", required = false) String date,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestBody List<String> seatNumbers,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        UUID token = lockService.lockSeats(schedule, seatNumbers, user, resolveTravelDate(schedule, travelDate, date), from, to);

        return Map.of(
                "status", "LOCKED",
                "lockToken", token,
                "expiresInMinutes", 15
        );
    }

    private LocalDate resolveTravelDate(RouteSchedule schedule, String travelDate, String fallbackDate) {
        String requestedDate = travelDate != null ? travelDate : fallbackDate;
        if (requestedDate != null && !requestedDate.isBlank()) {
            return LocalDate.parse(requestedDate);
        }
        return java.time.LocalDateTime.ofInstant(schedule.getDepartureTime(), java.time.ZoneOffset.UTC).toLocalDate();
    }

    private String normalizeFromStop(List<RouteSegment> segments, String from) {
        if (from != null && !from.isBlank()) return from;
        if (!segments.isEmpty()) return segments.get(0).getFromStop();
        return "";
    }

    private String normalizeToStop(List<RouteSegment> segments, String to) {
        if (to != null && !to.isBlank()) return to;
        if (!segments.isEmpty()) return segments.get(segments.size() - 1).getToStop();
        return "";
    }

    private boolean segmentsOverlap(List<RouteSegment> segments, String bookedFrom, String bookedTo, String reqFrom, String reqTo) {
        int bookedStart = indexOf(segments, bookedFrom);
        int bookedEnd = indexOf(segments, bookedTo);
        int reqStart = indexOf(segments, reqFrom);
        int reqEnd = indexOf(segments, reqTo);
        if (bookedStart == -1 || bookedEnd == -1 || reqStart == -1 || reqEnd == -1) return true;
        return bookedStart < reqEnd && bookedEnd > reqStart;
    }

    private int indexOf(List<RouteSegment> segments, String stop) {
        for (int i = 0; i < segments.size(); i++) {
            if (segments.get(i).getFromStop().equalsIgnoreCase(stop)) return i;
        }
        for (int i = 0; i < segments.size(); i++) {
            if (segments.get(i).getToStop().equalsIgnoreCase(stop)) return i + 1;
        }
        return -1;
    }

    // ─── GET my bookings (user) ───────────────────────────────────────────────
    @GetMapping("/my-bookings")
    public ResponseEntity<?> getMyBookings(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        List<Map<String, Object>> bookings = bookingRepository.findByUser(user).stream()
                .filter(b -> b.getStatus() != com.tripgo.backend.model.enums.BookingStatus.FAILED)
                .map(b -> {
                    List<BookingSeat> seats = bookingSeatRepository.findByBookingId(b.getId());
                    BookingSeat primarySeat = seats.isEmpty() ? null : seats.get(0);
                    Payment latestPayment = paymentRepository.findTopByBookingOrderByCreatedAtDesc(b).orElse(null);

                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("bookingId", b.getId());
                    result.put("bookingCode", b.getBookingCode());
                    result.put("status", b.getStatus());
                    result.put("paymentStatus", latestPayment != null ? latestPayment.getStatus() : null);
                    result.put("from", b.getRouteSchedule().getRoute().getOrigin());
                    result.put("to", b.getRouteSchedule().getRoute().getDestination());
                    result.put("fromStop", primarySeat != null ? primarySeat.getFromStop() : null);
                    result.put("toStop", primarySeat != null ? primarySeat.getToStop() : null);
                    result.put("departureTime", b.getRouteSchedule().getDepartureTime());
                    result.put("arrivalTime", b.getRouteSchedule().getArrivalTime());
                    result.put("travelDate", b.getTravelDate());
                    result.put("busName", b.getRouteSchedule().getBus().getName());
                    result.put("totalAmount", b.getTotalAmount());
                    result.put("payableAmount", b.getPayableAmount());
                    result.put("bookedAt", b.getCreatedAt());
                    result.put("cancelledBy", b.getCancelledBy());
                    result.put("cancelReason", b.getCancelReason());
                    result.put("refundAmount", b.getRefundAmount());
                    result.put("refundStatus", b.getRefundStatus());
                    result.put("passengers", seats.stream().map(s -> {
                        Map<String, Object> p = new LinkedHashMap<>();
                        p.put("seatNumber", s.getSeatNumber());
                        p.put("fromStop", s.getFromStop());
                        p.put("toStop", s.getToStop());
                        if (s.getPassenger() != null) {
                            p.put("firstName", s.getPassenger().getFirstName());
                            p.put("lastName", s.getPassenger().getLastName() != null ? s.getPassenger().getLastName() : "");
                            p.put("age", s.getPassenger().getAge());
                            p.put("gender", s.getPassenger().getGender());
                            p.put("phone", s.getPassenger().getPhone());
                        }
                        return p;
                    }).toList());
                    return result;
                })
                .toList();

        return ResponseEntity.ok(bookings);
    }
}
