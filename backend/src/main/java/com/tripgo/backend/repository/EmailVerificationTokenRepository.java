package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
  Optional<EmailVerificationToken> findByTokenAndUsedFalse(String token);
}