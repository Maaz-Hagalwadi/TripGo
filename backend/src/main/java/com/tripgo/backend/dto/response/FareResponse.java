package com.tripgo.backend.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record FareResponse(
        UUID id,
        UUID routeId,
        UUID segmentId,
        String seatType,
        BigDecimal baseFare,
        BigDecimal gstPercent,
        BigDecimal totalFare,
        UUID busId  // null = applies to every bus on the route
) {}