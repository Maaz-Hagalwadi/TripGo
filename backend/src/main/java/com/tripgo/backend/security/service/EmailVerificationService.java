package com.tripgo.backend.security.service;

import com.tripgo.backend.model.entities.EmailVerificationToken;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.EmailVerificationTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class EmailVerificationService {

    private final EmailVerificationTokenRepository tokenRepository;

    @Value("${app.email.verification-expiration}")
    private long verificationExpirationMs;

    public EmailVerificationToken createToken(User user) {

        EmailVerificationToken token = EmailVerificationToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiryDate(Instant.now().plusMillis(verificationExpirationMs))
                .used(false)
                .build();

        return tokenRepository.save(token);
    }

    public EmailVerificationToken validateToken(String tokenValue) {

        EmailVerificationToken token = tokenRepository
                .findByTokenAndUsedFalse(tokenValue)
                .orElseThrow(() -> new RuntimeException("Invalid verification token"));

        if (token.getExpiryDate().isBefore(Instant.now())) {
            throw new RuntimeException("Verification token expired");
        }

        return token;
    }

    public void markUsed(EmailVerificationToken token) {
        token.setUsed(true);
        tokenRepository.save(token);
    }
}

