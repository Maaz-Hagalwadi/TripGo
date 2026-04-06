package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.BoardingDroppingPointResponse;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
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
    private final PassengerRepository passengerRepository;

    // ─── GET seats for schedule ───────────────────────────────────────────────
    @GetMapping("/schedules/{scheduleId}/seats")
    public ResponseEntity<?> getSeatsForSchedule(@PathVariable UUID scheduleId) {
        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        List<Seat> seats = seatRepository.findByBus(schedule.getBus());

        List<Map<String, Object>> seatDTOs = seats.stream().map(seat -> {
            boolean isLocked = lockRepo
                    .findByRouteScheduleIdAndSeatNumber(scheduleId, seat.getSeatNumber())
                    .filter(lock -> lock.getExpiresAt().isAfter(Instant.now()))
                    .isPresent();

            // Check if seat is already booked
            boolean isBooked = bookingSeatRepository.existsByRouteScheduleIdAndSeatNumber(
                    scheduleId, seat.getSeatNumber());

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
            @RequestBody List<String> seatNumbers,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        UUID token = lockService.lockSeats(schedule, seatNumbers, user);

        return Map.of(
                "status", "LOCKED",
                "lockToken", token,
                "expiresInMinutes", 15
        );
    }

    // ─── POST confirm booking ─────────────────────────────────────────────────
    /**
     * Called after dummy/real payment succeeds.
     * Body:
     * {
     *   "lockToken": "uuid",
     *   "scheduleId": "uuid",
     *   "from": "Bangalore",
     *   "to": "Honnavar",
     *   "totalAmount": 500,
     *   "gstAmount": 90,
     *   "payableAmount": 590,
     *   "passengers": [
     *     { "seatNumber": "L1", "firstName": "John", "lastName": "Doe",
     *       "age": 25, "gender": "MALE", "phone": "9876543210" }
     *   ]
     * }
     */
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmBooking(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        UUID scheduleId = UUID.fromString((String) body.get("scheduleId"));
        UUID lockToken = UUID.fromString((String) body.get("lockToken"));
        String from = (String) body.get("from");
        String to = (String) body.get("to");
        BigDecimal totalAmount = new BigDecimal(body.get("totalAmount").toString());
        BigDecimal gstAmount = new BigDecimal(body.get("gstAmount").toString());
        BigDecimal payableAmount = new BigDecimal(body.get("payableAmount").toString());

        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        // Verify lock token is valid
        List<SeatLock> locks = lockRepo.findAll().stream()
                .filter(l -> l.getLockToken().equals(lockToken)
                        && l.getExpiresAt().isAfter(Instant.now())
                        && l.getLockedBy().getId().equals(user.getId()))
                .toList();

        if (locks.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Lock token expired or invalid. Please select seats again."));
        }

        // Create booking
        String bookingCode = "TG" + System.currentTimeMillis() % 100000000;
        Booking booking = Booking.builder()
                .user(user)
                .routeSchedule(schedule)
                .operator(schedule.getRoute().getOperator())
                .totalAmount(totalAmount)
                .gstAmount(gstAmount)
                .discountAmount(BigDecimal.ZERO)
                .payableAmount(payableAmount)
                .status(BookingStatus.CONFIRMED)
                .bookingCode(bookingCode)
                .build();

        bookingRepository.save(booking);

        // Save each passenger + booking seat
        List<?> rawPassengers = (List<?>) body.get("passengers");
        List<Map<String, Object>> passengers = rawPassengers.stream()
                .map(p -> (Map<String, Object>) p)
                .toList();

        List<Map<String, Object>> bookedSeats = new ArrayList<>();

        for (Map<String, Object> p : passengers) {
            String seatNumber = (String) p.get("seatNumber");

            // Save passenger
            Passenger passenger = Passenger.builder()
                    .user(user)
                    .firstName((String) p.get("firstName"))
                    .lastName((String) p.getOrDefault("lastName", ""))
                    .age(p.get("age") != null ? (Integer) p.get("age") : null)
                    .gender((String) p.getOrDefault("gender", ""))
                    .phone((String) p.getOrDefault("phone", ""))
                    .build();

            passengerRepository.save(passenger);

            // Find seat
            Seat seat = seatRepository.findByBus(schedule.getBus()).stream()
                    .filter(s -> s.getSeatNumber().equals(seatNumber))
                    .findFirst()
                    .orElse(null);

            // Save booking seat
            BigDecimal seatFare = payableAmount.divide(BigDecimal.valueOf(passengers.size()), 2, java.math.RoundingMode.HALF_UP);

            BookingSeat bookingSeat = BookingSeat.builder()
                    .booking(booking)
                    .seat(seat)
                    .seatNumber(seatNumber)
                    .fare(seatFare)
                    .passenger(passenger)
                    .fromStop(from)
                    .toStop(to)
                    .build();

            bookingSeatRepository.save(bookingSeat);

            bookedSeats.add(Map.of(
                    "seatNumber", seatNumber,
                    "passenger", passenger.getFirstName() + " " + passenger.getLastName()
            ));
        }

        // Release seat locks
        lockService.release(lockToken);

        return ResponseEntity.ok(Map.of(
                "bookingId", booking.getId(),
                "bookingCode", booking.getBookingCode(),
                "status", "CONFIRMED",
                "totalAmount", totalAmount,
                "payableAmount", payableAmount,
                "seats", bookedSeats,
                "message", "Booking confirmed successfully!"
        ));
    }

    // ─── GET my bookings (user) ───────────────────────────────────────────────
    @GetMapping("/my-bookings")
    public ResponseEntity<?> getMyBookings(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        List<Map<String, Object>> bookings = bookingRepository.findByUser(user).stream()
                .map(b -> {
                    List<BookingSeat> seats = bookingSeatRepository.findByBookingId(b.getId());

                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("bookingId", b.getId());
                    result.put("bookingCode", b.getBookingCode());
                    result.put("status", b.getStatus());
                    result.put("from", b.getRouteSchedule().getRoute().getOrigin());
                    result.put("to", b.getRouteSchedule().getRoute().getDestination());
                    result.put("departureTime", b.getRouteSchedule().getDepartureTime());
                    result.put("arrivalTime", b.getRouteSchedule().getArrivalTime());
                    result.put("busName", b.getRouteSchedule().getBus().getName());
                    result.put("totalAmount", b.getTotalAmount());
                    result.put("payableAmount", b.getPayableAmount());
                    result.put("bookedAt", b.getCreatedAt());
                    result.put("passengers", seats.stream().map(s -> {
                        Map<String, Object> p = new LinkedHashMap<>();
                        p.put("seatNumber", s.getSeatNumber());
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
