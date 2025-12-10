package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OtpCodeRepository extends JpaRepository<OtpCode, UUID> {
}