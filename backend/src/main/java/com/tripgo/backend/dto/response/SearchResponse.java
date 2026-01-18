package com.tripgo.backend.dto.response;

import java.util.List;

public record SearchResponse(
        FareResult fareResult,
        List<SeatAvailability> seatAvailability
) {}