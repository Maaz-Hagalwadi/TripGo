package com.tripgo.backend.dto.request;

import com.tripgo.backend.model.enums.BusType;

import java.util.List;
import java.util.UUID;

public record UpdateBusRequest(
        String name,
        String busCode,
        String vehicleNumber,
        String model,
        BusType busType,
        Integer totalSeats,
        List<UUID> amenityIds
) {}

