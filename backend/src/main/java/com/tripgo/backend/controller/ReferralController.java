package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.ReferralRewardRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/referrals")
@RequiredArgsConstructor
public class ReferralController {

    private final ReferralRewardRepository rewardRepository;
    private final WalletService walletService;

    @Value("${app.referral.referrer-reward:100}")
    private BigDecimal referrerReward;

    @Value("${app.referral.friend-reward:50}")
    private BigDecimal friendReward;

    @GetMapping("/me")
    public Map<String, Object> getMyReferrals(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        long successful = rewardRepository.countGrantedByReferrer(user.getId());
        BigDecimal totalEarned = successful > 0
                ? referrerReward.multiply(BigDecimal.valueOf(successful)) : BigDecimal.ZERO;

        return Map.of(
                "code", user.getReferralCode() != null ? user.getReferralCode() : "",
                "successfulReferrals", successful,
                "totalEarned", totalEarned,
                "rewardText", String.format("Earn ₹%.0f wallet credit for every friend who completes their first trip", referrerReward),
                "friendRewardText", String.format("Your friend gets ₹%.0f wallet credit on their first trip", friendReward)
        );
    }
}
