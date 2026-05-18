package com.tripgo.backend.repository;

import com.tripgo.backend.model.entities.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query(
        value = "SELECT * FROM audit_logs " +
                "WHERE (CAST(:action AS VARCHAR) IS NULL OR action = CAST(:action AS VARCHAR)) " +
                "AND (CAST(:entityType AS VARCHAR) IS NULL OR entity_type = CAST(:entityType AS VARCHAR)) " +
                "AND (CAST(:actorEmail AS VARCHAR) IS NULL OR LOWER(actor_email) LIKE LOWER('%' || CAST(:actorEmail AS VARCHAR) || '%')) " +
                "ORDER BY created_at DESC",
        countQuery = "SELECT COUNT(*) FROM audit_logs " +
                "WHERE (CAST(:action AS VARCHAR) IS NULL OR action = CAST(:action AS VARCHAR)) " +
                "AND (CAST(:entityType AS VARCHAR) IS NULL OR entity_type = CAST(:entityType AS VARCHAR)) " +
                "AND (CAST(:actorEmail AS VARCHAR) IS NULL OR LOWER(actor_email) LIKE LOWER('%' || CAST(:actorEmail AS VARCHAR) || '%'))",
        nativeQuery = true
    )
    Page<AuditLog> search(
            @Param("action")      String action,
            @Param("entityType")  String entityType,
            @Param("actorEmail")  String actorEmail,
            Pageable pageable
    );
}
