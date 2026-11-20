package com.tripgo.backend.service.impl;

import com.tripgo.backend.config.AppTime;

import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Payment;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.SchedulePolicy;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.model.enums.CancelledBy;
import com.tripgo.backend.model.enums.PaymentStatus;
import com.tripgo.backend.model.enums.TicketStatus;
import com.tripgo.backend.repository.BookingSeatRepository;
import com.tripgo.backend.repository.PaymentRepository;
import com.tripgo.backend.repository.TicketRepository;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.SchedulePolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CancellationService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final SchedulePolicyRepository schedulePolicyRepository;
    private final WalletService walletService;

    @Transactional
    public BigDecimal cancel(Booking booking, CancelledBy cancelledBy, String reason) {
        return cancel(booking, cancelledBy, reason, "ORIGINAL");
    }

    @Transactional
    public BigDecimal cancel(Booking booking, CancelledBy cancelledBy, String reason, String refundTo) {

        validateCancellation(booking, cancelledBy);

        BigDecimal refundAmount = calculateRefund(booking, cancelledBy);

        // Update booking
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledBy(cancelledBy);
        booking.setCancelReason(reason);
        booking.setCancelledAt(Instant.now());
        booking.setRefundAmount(refundAmount);
        booking.setRefundStatus(refundAmount.compareTo(BigDecimal.ZERO) > 0 ? "PENDING" : "NA");
        bookingRepository.save(booking);

        // Cancel ticket
        ticketRepository.findByBooking(booking).ifPresent(ticket -> {
            ticket.setStatus(TicketStatus.CANCELLED);
            ticketRepository.save(ticket);
        });

        // Process refund
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            if ("CREDIT".equalsIgnoreCase(refundTo) && booking.getUser() != null) {
                walletService.credit(booking.getUser(), refundAmount,
                        "Refund for cancelled booking " + booking.getBookingCode(), booking.getId());
                booking.setRefundStatus("PROCESSED");
                bookingRepository.save(booking);
            } else {
                processStripeRefund(booking, refundAmount);
            }
        }

        // Extract email data inside transaction before async call
        String userEmail = booking.getUser().getEmail();
        String firstName = booking.getUser().getFirstName();
        String from = booking.getRouteSchedule().getRoute().getOrigin();
        String to = booking.getRouteSchedule().getRoute().getDestination();
        String busName = booking.getRouteSchedule().getBus().getName();
        String bookingCode = booking.getBookingCode();
        String refundStatus = booking.getRefundStatus();

        // Send cancellation email
        emailService.sendCancellationEmail(
                userEmail, firstName, bookingCode, from, to, busName,
                cancelledBy, reason, refundAmount, refundStatus);

        // In-app notification
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            String refundMsg = "PROCESSED".equals(refundStatus)
                    ? String.format("₹%.0f has been refunded to your original payment method.", refundAmount)
                    : String.format("₹%.0f refund has been initiated and will be credited in 5–7 business days.", refundAmount);
            String notifType = "PROCESSED".equals(refundStatus) ? "REFUND_PROCESSED" : "REFUND_INITIATED";
            String notifTitle = "PROCESSED".equals(refundStatus) ? "Refund Processed" : "Refund Initiated";
            notificationService.send(booking.getUser(), notifType, notifTitle, refundMsg, "/bookings");
        } else {
            notificationService.send(booking.getUser(), "BOOKING_CANCELLED", "Booking Cancelled",
                    String.format("Your booking %s (%s → %s) has been cancelled. No refund is applicable.", bookingCode, from, to), "/bookings");
        }

        return refundAmount;
    }

    private void validateCancellation(Booking booking, CancelledBy cancelledBy) {
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking is already cancelled");
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("Only confirmed bookings can be cancelled");
        }

        if (cancelledBy == CancelledBy.OPERATOR) {
            // For recurring schedules use travelDate, otherwise use schedule departureTime
            Instant actualDeparture = resolveActualDeparture(booking);

            if (Instant.now().isAfter(actualDeparture)) {
                throw new RuntimeException("Cannot cancel after bus has departed");
            }

            String tripStatus = booking.getRouteSchedule().getTripStatus();
            if ("COMPLETED".equals(tripStatus)) {
                throw new RuntimeException("Cannot cancel a completed trip");
            }
        }
    }

    private Instant resolveActualDeparture(Booking booking) {
        RouteSchedule schedule = booking.getRouteSchedule();
        // For recurring schedules, combine travelDate with the time-of-day from departureTime
        if (schedule.getFrequency() != null && booking.getTravelDate() != null) {
            java.time.LocalTime timeOfDay = java.time.LocalDateTime
                    .ofInstant(schedule.getDepartureTime(), AppTime.ZONE)
                    .toLocalTime();
            return booking.getTravelDate().atTime(timeOfDay).atZone(AppTime.ZONE).toInstant();
        }
        return schedule.getDepartureTime();
    }

    private BigDecimal calculateRefund(Booking booking, CancelledBy cancelledBy) {
        // Operator cancels → 100% refund
        if (cancelledBy == CancelledBy.OPERATOR || cancelledBy == CancelledBy.SYSTEM) {
            return booking.getPayableAmount();
        }

        // User cancels → the operator's cancellation slabs for this schedule (same slabs shown before booking)
        Instant departure = resolveActualDeparture(booking);
        double hoursUntilDeparture = ChronoUnit.MINUTES.between(Instant.now(), departure) / 60.0;
        List<Map<String, Object>> slabs = schedulePolicyRepository
                .findByScheduleId(booking.getRouteSchedule().getId())
                .map(SchedulePolicy::getCancellationSlabs)
                .orElse(null);
        int percent = RefundPolicy.refundPercent(slabs, hoursUntilDeparture);

        return booking.getPayableAmount()
                .multiply(BigDecimal.valueOf(percent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private void processStripeRefund(Booking booking, BigDecimal refundAmount) {
        try {
            Payment payment = paymentRepository
                    .findTopByBookingOrderByCreatedAtDesc(booking)
                    .orElse(null);

            if (payment == null || payment.getStatus() != PaymentStatus.SUCCESS) return;

            long amountInPaise = refundAmount.multiply(BigDecimal.valueOf(100)).longValue();

            Refund.create(RefundCreateParams.builder()
                    .setPaymentIntent(payment.getProviderTransactionId())
                    .setAmount(amountInPaise)
                    .build());

            booking.setRefundStatus("PROCESSED");
            bookingRepository.save(booking);

        } catch (Exception e) {
            // Refund failed — keep status as PENDING for manual processing
            booking.setRefundStatus("PENDING");
            bookingRepository.save(booking);
        }
    }
}
