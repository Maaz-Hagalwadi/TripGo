package com.tripgo.backend.dto.response;

import com.tripgo.backend.model.enums.BusType;

import java.util.List;
import java.util.UUID;

public record BusResponse(
        UUID id,
        String name,
        String busCode,
        String vehicleNumber,
        String model,
        BusType busType,
        Integer totalSeats,
        boolean active,
        List<AmenityDTO> amenities
) {}
