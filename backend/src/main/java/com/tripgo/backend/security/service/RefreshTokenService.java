package com.tripgo.backend.security.service;

import com.tripgo.backend.model.entities.RefreshToken;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.RefreshTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;


    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    /**
     * Create and store refresh token
     */
    public RefreshToken createRefreshToken(User user, String tokenValue) {

        // 🔥 revoke previous tokens FIRST
        refreshTokenRepository.revokeAllByUser(user);

        RefreshToken refreshToken = RefreshToken.builder()
                .token(tokenValue)
                .user(user)
                .expiryDate(Instant.now().plusMillis(refreshTokenExpirationMs))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    /**
     * Validate refresh token from DB
     */
    public RefreshToken validateRefreshToken(String token) {

        RefreshToken refreshToken = refreshTokenRepository
                .findByTokenAndRevokedFalse(token)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));

        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            throw new RuntimeException("Refresh token expired");
        }

        return refreshToken;
    }

    /**
     * Revoke refresh token (logout / rotation)
     */
    public void revokeToken(RefreshToken refreshToken) {
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);
    }

    /**
     * Revoke all refresh tokens for a user (logout all devices)
     */
    public void revokeAllForUser(User user) {
        refreshTokenRepository.deleteByUser(user);
    }
}
