package com.tripgo.backend.service.impl;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Payment;
import com.tripgo.backend.model.enums.PaymentStatus;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * Closes bookings that were never paid. A PENDING booking stays payable for as long as its seat lock
 * (15 min) so the traveller can retry; after that grace window it is marked FAILED.
 *
 * Money safety: the Stripe PaymentIntent is cancelled first. Stripe refuses to cancel a payment that has
 * succeeded or is processing, and in that case the booking is left alone for the webhook / confirm call
 * to finish — so a late payment never ends up attached to a cancelled booking.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingExpiryService {

    /** Seat lock (15 min) + a little extra for 3-D Secure / slow banks. */
    public static final Duration PAYMENT_WINDOW = Duration.ofMinutes(20);

    private static final Set<String> STILL_IN_FLIGHT = Set.of("succeeded", "processing", "requires_capture");

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    public void expireStalePendingBookings() {
        Instant cutoff = Instant.now().minus(PAYMENT_WINDOW);
        for (Booking booking : bookingRepository.findStalePending(cutoff)) {
            try {
                expire(booking.getId());
            } catch (Exception e) {
                log.warn("Could not expire booking {}: {}", booking.getBookingCode(), e.getMessage());
            }
        }
    }

    // Called from the loop above (same bean), so no @Transactional here: each save and the final
    // conditional update commit on their own, and the update only fires while the booking is still PENDING.
    public void expire(UUID bookingId) throws StripeException {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) return;

        for (Payment payment : paymentRepository.findByBooking(booking)) {
            if (payment.getStatus() != PaymentStatus.INITIATED || payment.getProviderTransactionId() == null) continue;

            PaymentIntent intent = PaymentIntent.retrieve(payment.getProviderTransactionId());
            if (STILL_IN_FLIGHT.contains(intent.getStatus())) {
                // Paid or being paid — let the webhook / confirm endpoint confirm it
                log.info("Booking {} has a {} payment; not expiring", booking.getBookingCode(), intent.getStatus());
                return;
            }
            if (!"canceled".equals(intent.getStatus())) {
                intent.cancel(); // throws if it moved to succeeded/processing in the meantime → booking untouched
            }
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
        }

        if (bookingRepository.markFailedIfPending(bookingId) == 1) {
            log.info("Expired unpaid booking {}", booking.getBookingCode());
        }
    }
}
