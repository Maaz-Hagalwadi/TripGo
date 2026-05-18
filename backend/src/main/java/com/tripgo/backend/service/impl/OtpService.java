package com.tripgo.backend.service.impl;

import com.tripgo.backend.exception.BadRequestException;
import com.tripgo.backend.model.entities.OtpCode;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.OtpPurpose;
import com.tripgo.backend.repository.OtpCodeRepository;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class OtpService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 3;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpCodeRepository otpCodeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional
    public void generateAndSend(String identifier) {
        User user = userRepository.findByEmailOrPhone(identifier, identifier)
                .orElseThrow(() -> new BadRequestException("No account found with this email or phone"));

        if (!user.isEmailVerified()) {
            throw new BadRequestException("Please verify your email before using OTP login");
        }

        if (user.isSuspended()) {
            throw new BadRequestException("Your account has been suspended. Please contact support@tripgo.com.");
        }

        // Delete any existing OTP for this identifier before issuing a new one
        otpCodeRepository.deleteByPhoneAndPurpose(identifier, OtpPurpose.LOGIN);

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));

        OtpCode otpCode = OtpCode.builder()
                .phone(identifier)
                .code(code)
                .purpose(OtpPurpose.LOGIN)
                .attempts(0)
                .expiresAt(Instant.now().plusSeconds(OTP_EXPIRY_MINUTES * 60L))
                .build();

        otpCodeRepository.save(otpCode);
        emailService.sendOtpEmail(user.getEmail(), user.getFirstName(), code);
    }

    @Transactional
    public User verify(String identifier, String code) {
        OtpCode otpCode = otpCodeRepository.findByPhoneAndPurpose(identifier, OtpPurpose.LOGIN)
                .orElseThrow(() -> new BadRequestException("No OTP found. Please request a new one."));

        if (Instant.now().isAfter(otpCode.getExpiresAt())) {
            otpCodeRepository.delete(otpCode);
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        if (otpCode.getAttempts() >= MAX_ATTEMPTS) {
            otpCodeRepository.delete(otpCode);
            throw new BadRequestException("Too many incorrect attempts. Please request a new OTP.");
        }

        if (!otpCode.getCode().equals(code)) {
            otpCode.setAttempts(otpCode.getAttempts() + 1);
            otpCodeRepository.save(otpCode);
            int remaining = MAX_ATTEMPTS - otpCode.getAttempts();
            throw new BadRequestException("Incorrect OTP. " + remaining + " attempt(s) remaining.");
        }

        otpCodeRepository.delete(otpCode);

        return userRepository.findByEmailOrPhone(identifier, identifier)
                .orElseThrow(() -> new BadRequestException("User not found"));
    }
}
