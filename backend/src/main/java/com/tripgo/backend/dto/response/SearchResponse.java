package com.tripgo.backend.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SearchResponse(
        UUID scheduleId,
        String busName,
        String busCode,
        String busType,
        String operatorName,
        Instant departureTime,
        Instant arrivalTime,
        List<String> amenities,
        Map<String, FareResult> faresByType,
        List<SeatAvailability> seatAvailability,
        int totalSeats,
        int availableSeats,
        String tripStatus,
        Integer delayMinutes,
        Instant actualDepartureTime,
        Instant actualArrivalTime
) {}
