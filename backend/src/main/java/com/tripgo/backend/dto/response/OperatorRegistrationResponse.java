package com.tripgo.backend.dto.response;

import java.util.UUID;

public record OperatorRegistrationResponse(
        UUID userId,
        UUID operatorId,
        String status,
        String message
) {}

