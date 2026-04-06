package com.tripgo.backend.dto.response;

import java.util.List;
import java.util.Map;

public record SearchResult(
        Map<String, FareResult> faresByType,
        List<SeatAvailability> seatAvailability
) {}