package com.tripgo.backend.controller;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.model.entities.Ticket;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.model.enums.PaymentStatus;
import com.tripgo.backend.model.enums.TicketStatus;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.EmailService;
import com.tripgo.backend.service.impl.NotificationService;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final SeatLockRepository lockRepo;
    private final SeatLockService lockService;
    private final RouteScheduleRepository scheduleRepo;
    private final SeatRepository seatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PassengerRepository passengerRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final com.tripgo.backend.repository.UserRepository userRepository;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    /**
     * Step 1: Frontend calls this after locking seats.
     * Returns clientSecret which frontend uses to show Stripe payment form.
     *
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
    @PostMapping("/create-intent")
    public ResponseEntity<?> createIntent(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        try {
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

            // Verify lock is still valid
            List<SeatLock> locks = lockRepo.findAll().stream()
                    .filter(l -> l.getLockToken().equals(lockToken)
                            && l.getExpiresAt().isAfter(Instant.now())
                            && l.getLockedBy().getId().equals(user.getId()))
                    .toList();

            if (locks.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Lock token expired or invalid. Please select seats again."));
            }

            boolean segmentMismatch = locks.stream().anyMatch(lock ->
                    (lock.getFromStop() != null && from != null && !lock.getFromStop().equalsIgnoreCase(from))
                    || (lock.getToStop() != null && to != null && !lock.getToStop().equalsIgnoreCase(to))
            );
            if (segmentMismatch) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Selected segment does not match the locked seats. Please select seats again."));
            }

            // Parse passengers before idempotency check
            List<?> rawPassengers = (List<?>) body.get("passengers");
            List<Map<String, Object>> passengers = rawPassengers.stream()
                    .map(p -> (Map<String, Object>) p)
                    .toList();

            // Derive travelDate from the adjusted departure time passed in body, or fall back to schedule date
            java.time.LocalDate travelDate = null;
            if (body.get("travelDate") != null) {
                travelDate = java.time.LocalDate.parse((String) body.get("travelDate"));
            } else {
                travelDate = java.time.LocalDateTime
                        .ofInstant(schedule.getDepartureTime(), java.time.ZoneOffset.UTC)
                        .toLocalDate();
            }

            Set<String> requestedSeatNumbers = passengers.stream()
                    .map(p -> String.valueOf(p.get("seatNumber")))
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            // Idempotency: reuse existing PENDING booking + PaymentIntent if still usable
            List<Booking> existingPending = bookingRepository.findPendingByUserAndScheduleAndTravelDate(user, scheduleId, travelDate)
                    .stream()
                    .filter(existing -> {
                        List<BookingSeat> existingSeats = bookingSeatRepository.findByBookingId(existing.getId());
                        if (existingSeats.isEmpty()) return false;

                        Set<String> existingSeatNumbers = existingSeats.stream()
                                .map(BookingSeat::getSeatNumber)
                                .collect(Collectors.toCollection(LinkedHashSet::new));

                        boolean sameSegment = existingSeats.stream().allMatch(seat ->
                                Objects.equals(normalizeValue(seat.getFromStop()), normalizeValue(from))
                                && Objects.equals(normalizeValue(seat.getToStop()), normalizeValue(to))
                        );

                        return sameSegment && existingSeatNumbers.equals(requestedSeatNumbers);
                    })
                    .toList();
            if (!existingPending.isEmpty()) {
                Booking existing = existingPending.get(0);
                Payment existingPayment = paymentRepository.findByBooking(existing).stream()
                        .filter(p -> p.getStatus() == PaymentStatus.INITIATED)
                        .findFirst().orElse(null);
                if (existingPayment != null) {
                    PaymentIntent existingIntent = PaymentIntent.retrieve(existingPayment.getProviderTransactionId());
                    String intentStatus = existingIntent.getStatus();
                    // Only reuse if the intent is still awaiting payment
                    if ("requires_payment_method".equals(intentStatus) || "requires_confirmation".equals(intentStatus)) {
                        return ResponseEntity.ok(Map.of(
                                "clientSecret", existingIntent.getClientSecret(),
                                "bookingId", existing.getId(),
                                "bookingCode", existing.getBookingCode(),
                                "paymentIntentId", existingIntent.getId()
                        ));
                    }
                    // Intent is in a terminal/unusable state — mark old booking as FAILED and fall through to create new
                    existingPayment.setStatus(PaymentStatus.FAILED);
                    paymentRepository.save(existingPayment);
                    existing.setStatus(BookingStatus.FAILED);
                    bookingRepository.save(existing);
                }
            }

            // Create PENDING booking
            String bookingCode = "TG" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();

            Booking booking = Booking.builder()
                    .user(user)
                    .routeSchedule(schedule)
                    .operator(schedule.getRoute().getOperator())
                    .totalAmount(totalAmount)
                    .gstAmount(gstAmount)
                    .discountAmount(BigDecimal.ZERO)
                    .payableAmount(payableAmount)
                    .status(BookingStatus.PENDING)
                    .bookingCode(bookingCode)
                    .travelDate(travelDate)
                    .build();
            bookingRepository.save(booking);

            for (Map<String, Object> p : passengers) {
                String seatNumber = (String) p.get("seatNumber");
                Passenger passenger = Passenger.builder()
                        .user(user)
                        .firstName((String) p.get("firstName"))
                        .lastName((String) p.getOrDefault("lastName", ""))
                        .age(p.get("age") != null ? (Integer) p.get("age") : null)
                        .gender((String) p.getOrDefault("gender", ""))
                        .phone((String) p.getOrDefault("phone", ""))
                        .build();
                passengerRepository.save(passenger);

                Seat seat = seatRepository.findByBus(schedule.getBus()).stream()
                        .filter(s -> s.getSeatNumber().equals(seatNumber))
                        .findFirst().orElse(null);

                BigDecimal seatFare = payableAmount.divide(
                        BigDecimal.valueOf(passengers.size()), 2, java.math.RoundingMode.HALF_UP);

                bookingSeatRepository.save(BookingSeat.builder()
                        .booking(booking)
                        .seat(seat)
                        .seatNumber(seatNumber)
                        .fare(seatFare)
                        .passenger(passenger)
                        .fromStop(from)
                        .toStop(to)
                        .build());
            }

            // Create Stripe PaymentIntent (amount in paise — multiply by 100)
            long amountInPaise = payableAmount.multiply(BigDecimal.valueOf(100)).longValue();

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInPaise)
                    .setCurrency("inr")
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    )
                    .putMetadata("bookingId", booking.getId().toString())
                    .putMetadata("bookingCode", booking.getBookingCode())
                    .putMetadata("lockToken", lockToken.toString())
                    .putMetadata("userId", user.getId().toString())
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);

            // Save INITIATED payment record
            paymentRepository.save(Payment.builder()
                    .booking(booking)
                    .provider("STRIPE")
                    .providerTransactionId(intent.getId())
                    .amount(payableAmount)
                    .status(PaymentStatus.INITIATED)
                    .build());

            return ResponseEntity.ok(Map.of(
                    "clientSecret", intent.getClientSecret(),
                    "bookingId", booking.getId(),
                    "bookingCode", booking.getBookingCode(),
                    "paymentIntentId", intent.getId()
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Step 2a: Frontend calls this after Stripe confirms payment on client side.
     * Acts as a fallback in case webhook is delayed.
     */
    @PostMapping("/confirm-booking/{bookingId}")
    public ResponseEntity<?> confirmBookingAfterPayment(
            @PathVariable UUID bookingId,
            @RequestParam String paymentIntentId,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return ResponseEntity.badRequest().body(Map.of("error", "Booking has been cancelled"));
        }

        try {
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
            if (!"succeeded".equals(intent.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Payment is not completed yet"));
            }

            String intentBookingId = intent.getMetadata().get("bookingId");
            if (intentBookingId != null && !intentBookingId.equals(String.valueOf(bookingId))) {
                return ResponseEntity.badRequest().body(Map.of("error", "Payment does not belong to this booking"));
            }

            paymentRepository.findByProviderTransactionId(paymentIntentId).ifPresentOrElse(p -> {
                if (p.getStatus() != PaymentStatus.SUCCESS) {
                    p.setStatus(PaymentStatus.SUCCESS);
                    paymentRepository.save(p);
                }
            }, () -> paymentRepository.save(Payment.builder()
                    .booking(booking)
                    .provider("STRIPE")
                    .providerTransactionId(paymentIntentId)
                    .amount(booking.getPayableAmount())
                    .status(PaymentStatus.SUCCESS)
                    .build()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unable to verify payment with Stripe"));
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            booking.setStatus(BookingStatus.CONFIRMED);
            bookingRepository.save(booking);
            createTicketIfAbsent(booking);

            notificationService.send(booking.getUser(),
                    "BOOKING_CONFIRMED",
                    "Booking Confirmed! 🎉",
                    "Your booking " + booking.getBookingCode() + " is confirmed. Have a great trip!",
                    "/bookings");

            User opUser = userRepository.findByOperator(booking.getOperator()).orElse(null);
            if (opUser != null) {
                notificationService.send(opUser,
                        "NEW_BOOKING",
                        "New Booking Received",
                        "Booking " + booking.getBookingCode() + " confirmed on " + booking.getRouteSchedule().getBus().getName(),
                        "/operator/bookings?bookingCode=" + booking.getBookingCode());
            }

            // Send emails
            List<BookingSeat> seats = bookingSeatRepository.findByBookingId(booking.getId());
            Map<String, Object> emailDetails = new LinkedHashMap<>();
            emailDetails.put("bookingCode", booking.getBookingCode());
            emailDetails.put("from", seats.isEmpty() ? "-" : seats.get(0).getFromStop());
            emailDetails.put("to", seats.isEmpty() ? "-" : seats.get(0).getToStop());
            emailDetails.put("busName", booking.getRouteSchedule().getBus().getName());
            emailDetails.put("operatorName", booking.getOperator().getName());
            emailDetails.put("departureTime", booking.getRouteSchedule().getDepartureTime().toString());
            emailDetails.put("arrivalTime", booking.getRouteSchedule().getArrivalTime().toString());
            emailDetails.put("totalAmount", booking.getTotalAmount());
            emailDetails.put("gstAmount", booking.getGstAmount());
            emailDetails.put("payableAmount", booking.getPayableAmount());
            emailDetails.put("passengers", seats.stream().map(s -> {
                Map<String, Object> p = new LinkedHashMap<>();
                p.put("seatNumber", s.getSeatNumber());
                if (s.getPassenger() != null) {
                    p.put("firstName", s.getPassenger().getFirstName());
                    p.put("lastName", s.getPassenger().getLastName() != null ? s.getPassenger().getLastName() : "");
                    p.put("age", s.getPassenger().getAge());
                    p.put("gender", s.getPassenger().getGender());
                }
                return p;
            }).toList());
            emailService.sendBookingConfirmation(booking.getUser(), emailDetails);
            emailService.notifyOperatorNewBooking(booking, seats);
        }

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "CONFIRMED");
        response.put("bookingId", booking.getId());
        response.put("bookingCode", booking.getBookingCode());
        response.put("from", booking.getRouteSchedule().getRoute().getOrigin());
        response.put("to", booking.getRouteSchedule().getRoute().getDestination());
        response.put("busName", booking.getRouteSchedule().getBus().getName());
        response.put("totalAmount", booking.getTotalAmount());
        response.put("payableAmount", booking.getPayableAmount());
        response.put("passengers", bookingSeats.stream().map(s -> {
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
        return ResponseEntity.ok(response);
    }

    private String normalizeValue(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    /**
     * Step 2b: Stripe calls this automatically after payment succeeds/fails.
     * This is where we confirm the booking.
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        Event event;

        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            return ResponseEntity.badRequest().body("Invalid signature");
        }

        switch (event.getType()) {

            case "payment_intent.succeeded" -> {
                if (!(event.getDataObjectDeserializer().getObject().orElse(null) instanceof PaymentIntent intent))
                    break;

                String bookingId = intent.getMetadata().get("bookingId");
                String lockToken = intent.getMetadata().get("lockToken");

                Booking booking = bookingRepository.findById(UUID.fromString(bookingId))
                        .orElseThrow();

                // Idempotency check — don't confirm if already confirmed or cancelled
                if (booking.getStatus() == BookingStatus.CONFIRMED
                        || booking.getStatus() == BookingStatus.CANCELLED) break;

                booking.setStatus(BookingStatus.CONFIRMED);
                bookingRepository.save(booking);
                createTicketIfAbsent(booking);

                // Update payment record
                paymentRepository.findByProviderTransactionId(intent.getId())
                        .ifPresent(p -> {
                            p.setStatus(PaymentStatus.SUCCESS);
                            paymentRepository.save(p);
                        });

                // Release seat locks
                lockService.release(UUID.fromString(lockToken));

                // Notify user
                notificationService.send(booking.getUser(),
                        "BOOKING_CONFIRMED",
                        "Booking Confirmed! 🎉",
                        "Your booking " + booking.getBookingCode() + " is confirmed. Have a great trip!",
                        "/bookings");

                // Notify operator
                User opUser = userRepository.findByOperator(booking.getOperator()).orElse(null);
                if (opUser != null) {
                    notificationService.send(opUser,
                            "NEW_BOOKING",
                            "New Booking Received",
                            "Booking " + booking.getBookingCode() + " confirmed on " + booking.getRouteSchedule().getBus().getName(),
                            "/operator/bookings?bookingCode=" + booking.getBookingCode());
                }

                // Send confirmation email to user
                List<BookingSeat> seats = bookingSeatRepository.findByBookingId(booking.getId());
                Map<String, Object> emailDetails = new LinkedHashMap<>();
                emailDetails.put("bookingCode", booking.getBookingCode());
                emailDetails.put("from", seats.isEmpty() ? "-" : seats.get(0).getFromStop());
                emailDetails.put("to", seats.isEmpty() ? "-" : seats.get(0).getToStop());
                emailDetails.put("busName", booking.getRouteSchedule().getBus().getName());
                emailDetails.put("operatorName", booking.getOperator().getName());
                emailDetails.put("departureTime", booking.getRouteSchedule().getDepartureTime().toString());
                emailDetails.put("arrivalTime", booking.getRouteSchedule().getArrivalTime().toString());
                emailDetails.put("totalAmount", booking.getTotalAmount());
                emailDetails.put("gstAmount", booking.getGstAmount());
                emailDetails.put("payableAmount", booking.getPayableAmount());
                emailDetails.put("passengers", seats.stream().map(s -> {
                    Map<String, Object> p = new LinkedHashMap<>();
                    p.put("seatNumber", s.getSeatNumber());
                    if (s.getPassenger() != null) {
                        p.put("firstName", s.getPassenger().getFirstName());
                        p.put("lastName", s.getPassenger().getLastName() != null ? s.getPassenger().getLastName() : "");
                        p.put("age", s.getPassenger().getAge());
                        p.put("gender", s.getPassenger().getGender());
                    }
                    return p;
                }).toList());
                emailService.sendBookingConfirmation(booking.getUser(), emailDetails);

                // Notify operator of new booking
                emailService.notifyOperatorNewBooking(booking, seats);
            }

            case "payment_intent.payment_failed" -> {
                if (!(event.getDataObjectDeserializer().getObject().orElse(null) instanceof PaymentIntent intent))
                    break;

                String bookingId = intent.getMetadata().get("bookingId");

                Booking booking = bookingRepository.findById(UUID.fromString(bookingId))
                        .orElseThrow();

                booking.setStatus(BookingStatus.FAILED);
                bookingRepository.save(booking);

                paymentRepository.findByProviderTransactionId(intent.getId())
                        .ifPresent(p -> {
                            p.setStatus(PaymentStatus.FAILED);
                            paymentRepository.save(p);
                        });

                // Notify user of payment failure
                notificationService.send(booking.getUser(),
                        "PAYMENT_FAILED",
                        "Payment Failed",
                        "Your payment for the trip could not be processed. Please try again.",
                        "/search-results");

                List<BookingSeat> failedSeats = bookingSeatRepository.findByBookingId(booking.getId());
                String from = failedSeats.isEmpty() ? "-" : failedSeats.get(0).getFromStop();
                String to = failedSeats.isEmpty() ? "-" : failedSeats.get(0).getToStop();
                emailService.sendPaymentFailed(booking.getUser(), from, to,
                        booking.getRouteSchedule().getBus().getName(), booking.getPayableAmount());
            }

            default -> { /* ignore other events like charge.succeeded */ }
        }

        return ResponseEntity.ok("received");
    }

    private void createTicketIfAbsent(Booking booking) {
        if (ticketRepository.findByBooking(booking).isPresent()) return;
        String ticketNo = "TKT" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        ticketRepository.save(Ticket.builder()
                .booking(booking)
                .ticketNo(ticketNo)
                .status(TicketStatus.ACTIVE)
                .build());
    }
}
