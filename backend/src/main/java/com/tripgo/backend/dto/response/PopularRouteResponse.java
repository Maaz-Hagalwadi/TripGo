package com.tripgo.backend.dto.response;

import java.math.BigDecimal;

public record PopularRouteResponse(
        String from,
        String to,
        int buses,
        Integer durationMinutes,
        BigDecimal startingFare
) {}
