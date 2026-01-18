package com.tripgo.backend.dto.response;

public record SeatAvailability(
        String seatNumber,
        boolean available
) {}