package com.tripgo.backend.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record RouteResponse(
        UUID id,
        String name,
        String origin,
        String destination,
        BigDecimal distanceKm
) {}


