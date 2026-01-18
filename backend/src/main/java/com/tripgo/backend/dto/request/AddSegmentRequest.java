package com.tripgo.backend.dto.request;

import java.math.BigDecimal;

public record AddSegmentRequest(
        String fromStop,
        String toStop,
        BigDecimal distanceKm,
        Integer durationMinutes
) {}

