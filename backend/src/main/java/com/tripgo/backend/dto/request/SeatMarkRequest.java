package com.tripgo.backend.dto.request;

public record SeatMarkRequest(
        Boolean isLadiesOnly,
        Boolean isWindow,
        Boolean isAisle,
        Boolean isBlocked
) {}
