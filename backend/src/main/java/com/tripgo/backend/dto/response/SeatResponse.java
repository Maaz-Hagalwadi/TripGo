package com.tripgo.backend.dto.response;

import java.util.UUID;

public record SeatResponse(
        UUID id,
        String seatNumber,
        String seatType,
        boolean isAvailable
) {}