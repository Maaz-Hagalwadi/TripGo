package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.AuthAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuthAuditRepository extends JpaRepository<AuthAudit, UUID> {
}