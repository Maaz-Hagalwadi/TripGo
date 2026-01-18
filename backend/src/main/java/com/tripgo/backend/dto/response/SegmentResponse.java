package com.tripgo.backend.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record SegmentResponse(
        UUID id,
        Integer seq,
        String fromStop,
        String toStop,
        BigDecimal distanceKm,
        Integer durationMinutes
) {}
