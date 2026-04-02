package com.tripgo.backend.dto.response;

import java.time.Instant;
import java.util.UUID;

public record OperatorResponse(
        UUID id,
        String name,
        String shortName,
        String contactEmail,
        String contactPhone,
        String address,
        String status,
        Instant createdAt
) {}
