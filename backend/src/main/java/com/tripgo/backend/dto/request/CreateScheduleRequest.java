package com.tripgo.backend.dto.request;

import java.time.Instant;
import java.util.UUID;

public record CreateScheduleRequest(
        UUID busId,
        Instant departureTime,
        Instant arrivalTime,
        String frequency
) {}

