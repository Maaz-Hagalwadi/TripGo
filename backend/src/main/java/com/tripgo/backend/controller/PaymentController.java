package com.tripgo.backend.controller;

import com.tripgo.backend.config.AppTime;

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
import com.tripgo.backend.dto.response.FareResult;
import com.tripgo.backend.exception.BadRequestException;
import com.tripgo.backend.model.entities.BookingSeat;
import com.tripgo.backend.model.entities.RouteSegment;
import com.tripgo.backend.service.impl.EmailService;
import com.tripgo.backend.service.impl.NotificationService;
import com.tripgo.backend.service.impl.SeatAvailabilityService;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/payments")
@lombok.extern.slf4j.Slf4j
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
    private final RouteSegmentRepository routeSegmentRepository;
    private final SeatAvailabilityService seatAvailabilityService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final com.tripgo.backend.repository.UserRepository userRepository;
    private final com.tripgo.backend.service.impl.WalletService walletService;
    private final com.tripgo.backend.repository.BoardingDroppingPointRepository pointRepository;
    private final com.tripgo.backend.service.impl.DiscountService discountService;

    // Premium benefits (zero cancellation fees, priority seats/support) are not implemented yet,
    // so new memberships stay closed until they are. Re-enable with PREMIUM_SALES_ENABLED=true.
    @Value("${app.premium.sales-enabled:false}")
    private boolean premiumSalesEnabled;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    private static final Map<String, Integer> PLAN_DAYS = Map.of(
            "monthly", 30,
            "quarterly", 90,
            "yearly", 365
    );

    private static final Map<String, Long> PLAN_PAISE = Map.of(
            "monthly", 29900L,
            "quarterly", 74900L,
            "yearly", 249900L
    );

    @PostMapping("/premium/create-intent")
    public ResponseEntity<?> createPremiumIntent(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        if (!premiumSalesEnabled) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "TripGo Premium is coming soon. New memberships are not open yet."));
        }
        try {
            User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
            String plan = (String) body.get("plan");
            if (!PLAN_PAISE.containsKey(plan)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid plan"));
            }

            long amount = PLAN_PAISE.get(plan);
            int days = PLAN_DAYS.get(plan);
            Instant expiresAt = Instant.now().plus(days, java.time.temporal.ChronoUnit.DAYS);

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amount)
                    .setCurrency("inr")
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    )
                    .putMetadata("type", "PREMIUM")
                    .putMetadata("userId", user.getId().toString())
                    .putMetadata("plan", plan)
                    .putMetadata("expiresAt", expiresAt.toString())
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);

            return ResponseEntity.ok(Map.of(
                    "clientSecret", intent.getClientSecret(),
                    "paymentIntentId", intent.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

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
    // Transactional so the seat-lock row lock below is held until this checkout's booking is saved
    @Transactional
    @PostMapping("/create-intent")
    public ResponseEntity<?> createIntent(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        try {
            boolean isGuest = (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof CustomUserDetails));
            User user = isGuest ? null : ((CustomUserDetails) auth.getPrincipal()).getUser();

            String guestEmail = isGuest ? (String) body.get("guestEmail") : null;
            if (isGuest && (guestEmail == null || guestEmail.isBlank())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required for guest booking."));
            }

            UUID scheduleId = UUID.fromString((String) body.get("scheduleId"));
            UUID lockToken = UUID.fromString((String) body.get("lockToken"));
            String from = (String) body.get("from");
            String to = (String) body.get("to");

            RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                    .orElseThrow(() -> new RuntimeException("Schedule not found"));

            // Verify lock is still valid. Locking these rows serialises concurrent requests for the same
            // checkout (double click, retries, React StrictMode) so only one PENDING booking is created.
            List<SeatLock> locks = lockRepo.findByLockTokenForUpdate(lockToken).stream()
                    .filter(l -> l.getExpiresAt().isAfter(Instant.now())
                            && (isGuest
                                ? l.getLockedBy() == null
                                : l.getLockedBy() != null && l.getLockedBy().getId().equals(user.getId())))
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

            // Compute fare server-side — never trust client-supplied amounts
            List<RouteSegment> allSegments = routeSegmentRepository.findByRouteOrderBySeq(schedule.getRoute());
            int fromIdx = indexOfStop(allSegments, from);
            int toIdx   = indexOfStop(allSegments, to);
            if (fromIdx == -1 || toIdx == -1 || toIdx <= fromIdx) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid route segment: " + from + " → " + to));
            }
            List<RouteSegment> travelSegments = allSegments.subList(fromIdx, toIdx);
            Map<UUID, List<com.tripgo.backend.model.entities.Fare>> faresBySegment =
                    seatAvailabilityService.loadFaresBySegment(travelSegments);
            Map<String, FareResult> faresByType = seatAvailabilityService.computeFaresByType(
                    travelSegments, schedule.getBus().getId(), faresBySegment);

            if (faresByType.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No fares configured for this route segment."));
            }

            List<Seat> allBusSeats = seatRepository.findByBus(schedule.getBus());
            Map<String, String> seatTypeByNumber = allBusSeats.stream()
                    .collect(Collectors.toMap(Seat::getSeatNumber,
                            s -> s.getSeatType() != null ? s.getSeatType() : "",
                            (a, b) -> a));

            BigDecimal totalAmount   = BigDecimal.ZERO;
            BigDecimal gstAmount     = BigDecimal.ZERO;
            BigDecimal payableAmount = BigDecimal.ZERO;

            for (SeatLock lock : locks) {
                String seatType = seatTypeByNumber.getOrDefault(lock.getSeatNumber(), "");
                FareResult fare = faresByType.get(seatType);
                if (fare == null) fare = faresByType.values().iterator().next();
                totalAmount   = totalAmount.add(fare.baseFare());
                gstAmount     = gstAmount.add(fare.gstAmount());
                payableAmount = payableAmount.add(fare.totalFare());
            }

            // Parse passengers before idempotency check
            List<?> rawPassengers = (List<?>) body.get("passengers");
            List<Map<String, Object>> passengers = rawPassengers.stream()
                    .map(p -> (Map<String, Object>) p)
                    .toList();

            // Promo: re-validated here and taken off what Stripe charges (the page's discount used to be display-only)
            BigDecimal discountAmount = BigDecimal.ZERO;
            String promoCode = body.get("promoCode") instanceof String pc && !pc.isBlank() ? pc.trim().toUpperCase() : null;
            if (promoCode != null) {
                com.tripgo.backend.dto.request.ApplyPromoRequest promoReq = new com.tripgo.backend.dto.request.ApplyPromoRequest();
                promoReq.setCode(promoCode);
                promoReq.setBookingAmount(payableAmount);
                promoReq.setEmail(guestEmail);
                if (!passengers.isEmpty() && passengers.get(0).get("phone") instanceof String ph) promoReq.setPhone(ph);
                try {
                    discountAmount = discountService.applyPromo(promoReq, user).getDiscountAmount();
                } catch (com.tripgo.backend.exception.BadRequestException e) {
                    return ResponseEntity.badRequest().body(Map.of("error", e.getMessage() + ". Go back and remove the promo code to continue."));
                }
                payableAmount = payableAmount.subtract(discountAmount).max(BigDecimal.ZERO);
            }
            final BigDecimal expectedPayable = payableAmount;


            // Derive travelDate from the adjusted departure time passed in body, or fall back to schedule date
            java.time.LocalDate travelDate = null;
            if (body.get("travelDate") != null) {
                travelDate = java.time.LocalDate.parse((String) body.get("travelDate"));
            } else {
                travelDate = java.time.LocalDateTime
                        .ofInstant(schedule.getDepartureTime(), AppTime.ZONE)
                        .toLocalDate();
            }

            Set<String> requestedSeatNumbers = passengers.stream()
                    .map(p -> String.valueOf(p.get("seatNumber")))
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            // Idempotency: reuse an existing PENDING booking + PaymentIntent if still usable
            {
                List<Booking> candidates = isGuest
                        ? bookingRepository.findPendingByGuestAndScheduleAndTravelDate(guestEmail, scheduleId, travelDate)
                        : bookingRepository.findPendingByUserAndScheduleAndTravelDate(user, scheduleId, travelDate);
                List<Booking> existingPending = candidates
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

                            return sameSegment && existingSeatNumbers.equals(requestedSeatNumbers)
                                    && existing.getPayableAmount() != null && existing.getPayableAmount().compareTo(expectedPayable) == 0;
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
            }

            // ── Ladies-only / beside-woman enforcement ───────────────────────────
            List<BookingSeat> confirmedSeatsForCheck =
                    bookingSeatRepository.findConfirmedByScheduleIdAndTravelDate(scheduleId, travelDate);

            // Never sell a seat twice: one of the held seats may have been booked since it was held
            Set<String> heldSeats = locks.stream().map(l -> l.getSeatNumber().toUpperCase()).collect(Collectors.toSet());
            Optional<String> sold = confirmedSeatsForCheck.stream()
                    .filter(bs -> heldSeats.contains(bs.getSeatNumber().toUpperCase()))
                    .filter(bs -> segmentsOverlap(allSegments, bs.getFromStop(), bs.getToStop(), from, to))
                    .map(BookingSeat::getSeatNumber)
                    .findFirst();
            if (sold.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error",
                        "Seat " + sold.get() + " has already been booked. Please go back and choose another seat."));
            }

            Set<String> femaleBookedSeats = confirmedSeatsForCheck.stream()
                    .filter(bs -> segmentsOverlap(allSegments, bs.getFromStop(), bs.getToStop(), from, to))
                    .filter(bs -> bs.getPassenger() != null
                            && "female".equalsIgnoreCase(bs.getPassenger().getGender()))
                    .map(bs -> bs.getSeatNumber().toUpperCase())
                    .collect(Collectors.toSet());

            // Seats in the same request don't restrict each other
            Set<String> requestSeatNums = passengers.stream()
                    .map(p -> String.valueOf(p.get("seatNumber")).toUpperCase())
                    .collect(Collectors.toSet());

            // Max column index per deck (0=lower,1=upper) — determines aisle position
            Map<Integer, Integer> maxColByDeck = new HashMap<>();
            for (Seat s : allBusSeats) {
                int[] placed = placeSeat(s.getSeatNumber());
                if (placed != null) maxColByDeck.merge(placed[0], placed[2], Math::max);
            }

            Map<String, Seat> seatByNum = allBusSeats.stream()
                    .collect(Collectors.toMap(s -> s.getSeatNumber().toUpperCase(), s -> s, (a, b) -> a));

            for (Map<String, Object> p : passengers) {
                String seatNum = String.valueOf(p.get("seatNumber")).toUpperCase();
                String gender  = p.get("gender") != null ? String.valueOf(p.get("gender")) : "";
                if ("FEMALE".equalsIgnoreCase(gender)) continue;

                Seat chkSeat = seatByNum.get(seatNum);
                if (chkSeat != null && Boolean.TRUE.equals(chkSeat.getIsLadiesOnly())) {
                    throw new BadRequestException("Seat " + seatNum + " is reserved for women only");
                }

                boolean besideWoman = femaleBookedSeats.stream()
                        .filter(fs -> !requestSeatNums.contains(fs))
                        .anyMatch(fs -> areSeatNeighbours(seatNum, fs, maxColByDeck));
                if (besideWoman) {
                    throw new BadRequestException(
                            "Seat " + seatNum + " is next to a woman traveller and can only be booked for a woman");
                }
            }

            // Create PENDING booking
            String bookingCode = "TG" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();

            String guestPhone = null;
            if (isGuest && !passengers.isEmpty()) {
                guestPhone = (String) passengers.get(0).getOrDefault("phone", null);
            }

            Booking booking = Booking.builder()
                    .user(user)
                    .guestEmail(isGuest ? guestEmail : null)
                    .guestPhone(isGuest ? guestPhone : null)
                    .routeSchedule(schedule)
                    .operator(schedule.getRoute().getOperator())
                    .totalAmount(totalAmount)
                    .gstAmount(gstAmount)
                    .discountAmount(discountAmount)
                    .promoCode(promoCode)
                    .payableAmount(payableAmount)
                    .status(BookingStatus.PENDING)
                    .bookingCode(bookingCode)
                    .travelDate(travelDate)
                    .build();
            applyChosenPoint(booking, schedule, body.get("boardingPointId"), "BOARDING");
            applyChosenPoint(booking, schedule, body.get("droppingPointId"), "DROPPING");
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

            // ── Wallet credit path ───────────────────────────────────────────────
            boolean useCredit = Boolean.TRUE.equals(body.get("useCredit")) && user != null;
            if (useCredit) {
                BigDecimal balance = walletService.getBalance(user);
                if (balance.compareTo(payableAmount) >= 0) {
                    // Full wallet payment — debit and confirm immediately
                    walletService.debit(user, payableAmount,
                            "Payment for booking " + booking.getBookingCode(), booking.getId());
                    paymentRepository.save(Payment.builder()
                            .booking(booking)
                            .provider("WALLET")
                            .providerTransactionId("WALLET-" + booking.getId())
                            .amount(payableAmount)
                            .status(PaymentStatus.SUCCESS)
                            .build());
                    booking.setStatus(BookingStatus.CONFIRMED);
                    bookingRepository.save(booking);
                    createTicketIfAbsent(booking);
                    countPromoUse(booking);
                    lockService.release(lockToken);
                    if (booking.getUser() != null) {
                        notificationService.send(booking.getUser(), "BOOKING_CONFIRMED",
                                "Booking Confirmed!",
                                "Your booking " + booking.getBookingCode() + " is confirmed. Have a great trip!",
                                "/bookings");
                    }
                    User opUser = userRepository.findByOperator(booking.getOperator()).orElse(null);
                    if (opUser != null) {
                        notificationService.send(opUser, "NEW_BOOKING", "New Booking Received",
                                "Booking " + booking.getBookingCode() + " confirmed on "
                                        + booking.getRouteSchedule().getBus().getName(),
                                "/operator/bookings?bookingCode=" + booking.getBookingCode());
                    }
                    List<BookingSeat> walletSeats = bookingSeatRepository.findByBookingId(booking.getId());
                    Map<String, Object> emailDetails = new LinkedHashMap<>();
                    emailDetails.put("bookingCode", booking.getBookingCode());
                    emailDetails.put("from", walletSeats.isEmpty() ? "-" : walletSeats.get(0).getFromStop());
                    emailDetails.put("to", walletSeats.isEmpty() ? "-" : walletSeats.get(0).getToStop());
                    emailDetails.put("busName", booking.getRouteSchedule().getBus().getName());
                    emailDetails.put("operatorName", booking.getOperator().getName());
                    emailDetails.put("departureTime", booking.getRouteSchedule().getDepartureTime().toString());
                    emailDetails.put("arrivalTime", booking.getRouteSchedule().getArrivalTime().toString());
                    emailDetails.put("totalAmount", booking.getTotalAmount());
                    emailDetails.put("gstAmount", booking.getGstAmount());
                    emailDetails.put("payableAmount", booking.getPayableAmount());
                    emailDetails.put("passengers", walletSeats.stream().map(s -> {
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
                    emailService.notifyOperatorNewBooking(booking, walletSeats);
                    return ResponseEntity.ok(Map.of(
                            "status", "CREDIT_PAID",
                            "bookingId", booking.getId(),
                            "bookingCode", booking.getBookingCode()
                    ));
                }
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
                    .putMetadata(isGuest ? "guestEmail" : "userId",
                                 isGuest ? guestEmail : user.getId().toString())
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
    private void countPromoUse(Booking booking) {
        try {
            discountService.recordUse(booking.getPromoCode());
        } catch (Exception e) {
            log.warn("Couldn't count promo use for booking {}: {}", booking.getId(), e.getMessage());
        }
    }

    /** Copies the traveller's chosen point onto the booking; ignores ids that aren't this departure's. */
    private void applyChosenPoint(Booking booking, RouteSchedule schedule, Object rawId, String type) {
        if (!(rawId instanceof String id) || id.isBlank()) return;
        UUID pointId;
        try { pointId = UUID.fromString(id); } catch (IllegalArgumentException e) { return; }
        pointRepository.findById(pointId)
                .filter(p -> p.getSchedule().getId().equals(schedule.getId()) && type.equals(p.getType()))
                .ifPresent(p -> {
                    if ("BOARDING".equals(type)) { booking.setBoardingPoint(p.getName()); booking.setBoardingTime(p.getArrivalTime()); }
                    else { booking.setDroppingPoint(p.getName()); booking.setDroppingTime(p.getArrivalTime()); }
                });
    }

    @PostMapping("/confirm-booking/{bookingId}")
    public ResponseEntity<?> confirmBookingAfterPayment(
            @PathVariable UUID bookingId,
            @RequestParam String paymentIntentId,
            Authentication auth) {

        boolean isGuest = (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof CustomUserDetails));
        User user = isGuest ? null : ((CustomUserDetails) auth.getPrincipal()).getUser();

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!isGuest) {
            if (booking.getUser() == null || !booking.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
            }
        } else {
            // Guest: verify via Stripe that the PaymentIntent's bookingId metadata matches
            try {
                PaymentIntent intentCheck = PaymentIntent.retrieve(paymentIntentId);
                String intentBookingId = intentCheck.getMetadata().get("bookingId");
                if (!booking.getId().toString().equals(intentBookingId) || booking.getUser() != null) {
                    return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
            }
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
            countPromoUse(booking);

            if (booking.getUser() != null) {
                notificationService.send(booking.getUser(),
                        "BOOKING_CONFIRMED",
                        "Booking Confirmed! 🎉",
                        "Your booking " + booking.getBookingCode() + " is confirmed. Have a great trip!",
                        "/bookings");
            }

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
            if (booking.getUser() != null) {
                emailService.sendBookingConfirmation(booking.getUser(), emailDetails);
            } else if (booking.getGuestEmail() != null) {
                emailService.sendGuestBookingConfirmation(booking.getGuestEmail(), booking.getBookingCode(), emailDetails);
            }
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

    private boolean segmentsOverlap(List<RouteSegment> segments,
                                     String bookedFrom, String bookedTo,
                                     String reqFrom, String reqTo) {
        int bStart = indexOfStop(segments, bookedFrom);
        int bEnd   = indexOfStop(segments, bookedTo);
        int rStart = indexOfStop(segments, reqFrom);
        int rEnd   = indexOfStop(segments, reqTo);
        if (bStart == -1 || bEnd == -1 || rStart == -1 || rEnd == -1) return true;
        return bStart < rEnd && bEnd > rStart;
    }

    /** Places a seat on its (deck, row, col) grid. Returns int[]{deck,row,col} or null. */
    private static int[] placeSeat(String seatNum) {
        if (seatNum == null) return null;
        seatNum = seatNum.trim().toUpperCase();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^([LU])(\\d+)$").matcher(seatNum);
        if (m.matches()) {
            int pos = Integer.parseInt(m.group(2)) - 1;
            return new int[]{"U".equals(m.group(1)) ? 1 : 0, pos / 3, pos % 3};
        }
        m = java.util.regex.Pattern.compile("^(\\d+)([A-F])$").matcher(seatNum);
        if (m.matches()) {
            return new int[]{0, Integer.parseInt(m.group(1)) - 1, m.group(2).charAt(0) - 'A'};
        }
        m = java.util.regex.Pattern.compile("^([A-F])(\\d+)$").matcher(seatNum);
        if (m.matches()) {
            return new int[]{0, Integer.parseInt(m.group(2)) - 1, m.group(1).charAt(0) - 'A'};
        }
        return null;
    }

    private static boolean areSeatNeighbours(String a, String b, Map<Integer, Integer> maxColByDeck) {
        int[] pa = placeSeat(a);
        int[] pb = placeSeat(b);
        if (pa == null || pb == null) return false;
        if (pa[0] != pb[0] || pa[1] != pb[1]) return false; // different deck or row
        if (Math.abs(pa[2] - pb[2]) != 1) return false;     // not adjacent column
        int totalCols = maxColByDeck.getOrDefault(pa[0], 3) + 1;
        int aisle = totalCols >= 4 ? totalCols / 2 - 1 : totalCols >= 2 ? 0 : -1;
        return (pa[2] <= aisle ? 0 : 1) == (pb[2] <= aisle ? 0 : 1);
    }

    private String normalizeValue(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private int indexOfStop(List<RouteSegment> segments, String stop) {
        if (stop == null) return -1;
        for (int i = 0; i < segments.size(); i++) {
            if (segments.get(i).getFromStop().equalsIgnoreCase(stop)) return i;
        }
        for (int i = 0; i < segments.size(); i++) {
            if (segments.get(i).getToStop().equalsIgnoreCase(stop)) return i + 1;
        }
        return -1;
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

                if ("PREMIUM".equals(intent.getMetadata().get("type"))) {
                    String userId = intent.getMetadata().get("userId");
                    String plan = intent.getMetadata().get("plan");
                    userRepository.findById(UUID.fromString(userId)).ifPresent(u -> {
                        u.setPremium(true);
                        int days = PLAN_DAYS.getOrDefault(plan, 30);
                        u.setPremiumExpiresAt(Instant.now().plus(days, java.time.temporal.ChronoUnit.DAYS));
                        userRepository.save(u);
                    });
                    break;
                }

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
                countPromoUse(booking);

                // Update payment record
                paymentRepository.findByProviderTransactionId(intent.getId())
                        .ifPresent(p -> {
                            p.setStatus(PaymentStatus.SUCCESS);
                            paymentRepository.save(p);
                        });

                // Release seat locks
                lockService.release(UUID.fromString(lockToken));

                // Notify user (only if authenticated booking)
                if (booking.getUser() != null) {
                    notificationService.send(booking.getUser(),
                            "BOOKING_CONFIRMED",
                            "Booking Confirmed! 🎉",
                            "Your booking " + booking.getBookingCode() + " is confirmed. Have a great trip!",
                            "/bookings");
                }

                // Notify operator
                User opUser = userRepository.findByOperator(booking.getOperator()).orElse(null);
                if (opUser != null) {
                    notificationService.send(opUser,
                            "NEW_BOOKING",
                            "New Booking Received",
                            "Booking " + booking.getBookingCode() + " confirmed on " + booking.getRouteSchedule().getBus().getName(),
                            "/operator/bookings?bookingCode=" + booking.getBookingCode());
                }

                // Send confirmation email to user or guest
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
                if (booking.getUser() != null) {
                    emailService.sendBookingConfirmation(booking.getUser(), emailDetails);
                } else if (booking.getGuestEmail() != null) {
                    emailService.sendGuestBookingConfirmation(booking.getGuestEmail(), booking.getBookingCode(), emailDetails);
                }

                // Notify operator of new booking
                emailService.notifyOperatorNewBooking(booking, seats);
            }

            case "payment_intent.payment_failed" -> {
                if (!(event.getDataObjectDeserializer().getObject().orElse(null) instanceof PaymentIntent intent))
                    break;

                if ("PREMIUM".equals(intent.getMetadata().get("type"))) break;

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

                // Notify user of payment failure (only if authenticated booking)
                if (booking.getUser() != null) {
                    notificationService.send(booking.getUser(),
                            "PAYMENT_FAILED",
                            "Payment Failed",
                            "Your payment for the trip could not be processed. Please try again.",
                            "/search-results");
                }

                List<BookingSeat> failedSeats = bookingSeatRepository.findByBookingId(booking.getId());
                String from = failedSeats.isEmpty() ? "-" : failedSeats.get(0).getFromStop();
                String to = failedSeats.isEmpty() ? "-" : failedSeats.get(0).getToStop();
                if (booking.getUser() != null) {
                    emailService.sendPaymentFailed(booking.getUser(), from, to,
                            booking.getRouteSchedule().getBus().getName(), booking.getPayableAmount());
                } else if (booking.getGuestEmail() != null) {
                    emailService.sendGuestPaymentFailed(booking.getGuestEmail(), from, to,
                            booking.getRouteSchedule().getBus().getName(), booking.getPayableAmount());
                }
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
