package com.tripgo.backend.dto.response;

import java.math.BigDecimal;

public record FareResult(
        BigDecimal baseFare,
        BigDecimal gstAmount,
        BigDecimal totalFare
) {}