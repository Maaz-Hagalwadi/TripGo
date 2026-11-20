package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.ReferralReward;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.ReferralRewardRepository;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReferralService {

    @Value("${app.referral.referrer-reward:100}")
    private BigDecimal referrerReward;

    @Value("${app.referral.friend-reward:50}")
    private BigDecimal friendReward;

    private final ReferralRewardRepository rewardRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final WalletService walletService;
    private final NotificationService notificationService;

    public Optional<User> findByCode(String code) {
        return userRepository.findByReferralCode(code.trim().toUpperCase());
    }

    // Called when a referred user completes their first trip
    @Transactional
    public void onTripCompleted(UUID scheduleId) {
        // Find all confirmed bookings on this schedule
        List<Booking> confirmed = bookingRepository.findByRouteScheduleIdAndStatus(scheduleId);
        for (Booking booking : confirmed) {
            User traveller = booking.getUser();
            if (traveller == null || traveller.getReferredBy() == null) continue;

            // Only grant once — idempotency check
            rewardRepository.findByReferredId(traveller.getId()).ifPresent(reward -> {
                if (!"PENDING".equals(reward.getStatus())) return;

                // This is their first completed trip — grant rewards
                User referrer = userRepository.findById(traveller.getReferredBy()).orElse(null);
                if (referrer == null) return;

                walletService.credit(referrer, referrerReward,
                        "Referral reward — " + traveller.getFirstName() + " completed their first trip", booking.getId());
                walletService.credit(traveller, friendReward,
                        "Welcome reward — first trip completed via referral", booking.getId());

                reward.setStatus("GRANTED");
                reward.setBookingId(booking.getId());
                rewardRepository.save(reward);

                notificationService.send(referrer, "REFERRAL_REWARD",
                        "Referral Reward Earned!",
                        String.format("₹%.0f added to your TripGo wallet — %s just completed their first trip!",
                                referrerReward, traveller.getFirstName()),
                        "/wallet");

                notificationService.send(traveller, "REFERRAL_REWARD",
                        "Welcome Reward Added!",
                        String.format("₹%.0f added to your TripGo wallet for completing your first trip!", friendReward),
                        "/wallet");

                log.info("Referral reward granted: referrer={} referred={}", referrer.getId(), traveller.getId());
            });
        }
    }
}
