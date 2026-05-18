package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.BookingSeat;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.BookingSeatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingReminderService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final EmailService emailService;

    // Runs every day at 8:00 AM UTC
    @Scheduled(cron = "0 0 8 * * *")
    public void sendTomorrowReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Booking> bookings = bookingRepository.findByTravelDateAndStatus(tomorrow, BookingStatus.CONFIRMED);

        int sent = 0;
        for (Booking booking : bookings) {
            try {
                List<BookingSeat> seats = bookingSeatRepository.findByBookingId(booking.getId());
                emailService.sendBookingReminder(booking.getUser(), booking, seats);
                sent++;
            } catch (Exception e) {
                log.error("Failed to send reminder for booking {}: {}", booking.getId(), e.getMessage());
            }
        }
        log.info("Sent {}/{} booking reminders for {}", sent, bookings.size(), tomorrow);
    }
}
