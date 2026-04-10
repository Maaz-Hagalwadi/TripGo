package com.tripgo.backend.service.impl;

import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Payment;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.model.enums.CancelledBy;
import com.tripgo.backend.model.enums.PaymentStatus;
import com.tripgo.backend.model.enums.TicketStatus;
import com.tripgo.backend.repository.BookingSeatRepository;
import com.tripgo.backend.repository.PaymentRepository;
import com.tripgo.backend.repository.TicketRepository;
import com.tripgo.backend.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class CancellationService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final EmailService emailService;

    @Transactional
    public BigDecimal cancel(Booking booking, CancelledBy cancelledBy, String reason) {

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

        // Process Stripe refund if applicable
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            processStripeRefund(booking, refundAmount);
        }

        // Send cancellation email
        emailService.sendCancellationEmail(booking, refundAmount, reason, cancelledBy);

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
                    .ofInstant(schedule.getDepartureTime(), java.time.ZoneOffset.UTC)
                    .toLocalTime();
            return booking.getTravelDate().atTime(timeOfDay).toInstant(java.time.ZoneOffset.UTC);
        }
        return schedule.getDepartureTime();
    }

    private BigDecimal calculateRefund(Booking booking, CancelledBy cancelledBy) {
        // Operator cancels → 100% refund
        if (cancelledBy == CancelledBy.OPERATOR || cancelledBy == CancelledBy.SYSTEM) {
            return booking.getPayableAmount();
        }

        // User cancels → time-based partial refund
        Instant departure = resolveActualDeparture(booking);
        long hoursUntilDeparture = ChronoUnit.HOURS.between(Instant.now(), departure);

        if (hoursUntilDeparture >= 24) {
            // More than 24 hours → 75% refund
            return booking.getPayableAmount()
                    .multiply(BigDecimal.valueOf(0.75))
                    .setScale(2, RoundingMode.HALF_UP);
        } else if (hoursUntilDeparture >= 12) {
            // 12–24 hours → 50% refund
            return booking.getPayableAmount()
                    .multiply(BigDecimal.valueOf(0.50))
                    .setScale(2, RoundingMode.HALF_UP);
        } else if (hoursUntilDeparture >= 4) {
            // 4–12 hours → 25% refund
            return booking.getPayableAmount()
                    .multiply(BigDecimal.valueOf(0.25))
                    .setScale(2, RoundingMode.HALF_UP);
        } else {
            // Less than 4 hours → no refund
            return BigDecimal.ZERO;
        }
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
