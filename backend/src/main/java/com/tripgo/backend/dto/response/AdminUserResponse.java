package com.tripgo.backend.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        boolean emailVerified,
        List<String> roles,
        Instant createdAt
) {}
