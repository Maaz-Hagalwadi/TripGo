package com.tripgo.backend.dto.response;

import java.util.List;

public record SearchResult(
        FareResult fareResult,
        List<SeatAvailability> seatAvailability
) {}