package com.tripgo.backend.dto.response;

import java.time.Instant;
import java.util.UUID;

public record RouteScheduleResponse(
        UUID id,
        RouteResponse route,
        BusResponse bus,
        Instant departureTime,
        Instant arrivalTime,
        String frequency,
        boolean active,
        // Driver
        UUID driverId,
        String driverName,
        // Trip runtime
        String tripStatus,
        Integer delayMinutes,
        String delayReason,
        Instant actualDepartureTime,
        Instant actualArrivalTime
) {}
