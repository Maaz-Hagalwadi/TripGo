package com.tripgo.backend.dto.response;

import com.tripgo.backend.model.enums.BusType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Bus as the admin sees it: the operator-facing fields plus who owns the bus. */
public record AdminBusResponse(
        UUID id,
        String name,
        String busCode,
        String vehicleNumber,
        String model,
        BusType busType,
        Integer totalSeats,
        boolean active,
        List<AmenityDTO> amenities,
        UUID operatorId,
        String operatorName,
        Instant createdAt,
        Instant updatedAt
) {}
