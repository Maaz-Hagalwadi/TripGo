package com.tripgo.backend.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

public record AddFareRequest(
        UUID segmentId,
        String seatType,
        BigDecimal baseFare,
        BigDecimal gstPercent
) {}

