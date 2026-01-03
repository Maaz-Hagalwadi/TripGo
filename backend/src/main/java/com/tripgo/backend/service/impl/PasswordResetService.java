package com.tripgo.backend.service.impl;
import com.tripgo.backend.model.entities.PasswordResetToken;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.PasswordResetTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;


@Service
@RequiredArgsConstructor
@Transactional
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;

    @Value("${app.password.reset-expiration}")
    private long resetExpirationMs;

    public PasswordResetToken createToken(User user) {

        PasswordResetToken token = PasswordResetToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiryDate(Instant.now().plusMillis(resetExpirationMs))
                .used(false)
                .build();

        return tokenRepository.save(token);
    }

    public PasswordResetToken validateToken(String tokenValue) {

        PasswordResetToken token = tokenRepository
                .findByTokenAndUsedFalse(tokenValue)
                .orElseThrow(() -> new RuntimeException("Invalid reset token"));

        if (token.getExpiryDate().isBefore(Instant.now())) {
            throw new RuntimeException("Reset token expired");
        }

        return token;
    }

    public void markUsed(PasswordResetToken token) {
        token.setUsed(true);
        tokenRepository.save(token);
    }
}
