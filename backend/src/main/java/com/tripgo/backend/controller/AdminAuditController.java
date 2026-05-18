package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.AuditLog;
import com.tripgo.backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<?> getLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        size = Math.min(size, 100);
        Page<AuditLog> result = auditLogRepository.search(
                action     != null && !action.isBlank()     ? action     : null,
                entityType != null && !entityType.isBlank() ? entityType : null,
                actorEmail != null && !actorEmail.isBlank() ? actorEmail : null,
                PageRequest.of(page, size)
        );
        return ResponseEntity.ok(Map.of(
                "content",       result.getContent(),
                "totalElements", result.getTotalElements(),
                "totalPages",    result.getTotalPages(),
                "page",          page,
                "size",          size
        ));
    }
}
