package com.tripgo.backend.dto.response;

import java.time.Instant;
import java.util.UUID;

public record RouteScheduleResponse(
        UUID id,
        UUID routeId,
        UUID busId,
        Instant departureTime,
        Instant arrivalTime,
        String frequency,
        boolean active
) {}