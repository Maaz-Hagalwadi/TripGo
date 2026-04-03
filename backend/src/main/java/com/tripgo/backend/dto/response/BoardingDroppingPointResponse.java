package com.tripgo.backend.dto.response;

import com.tripgo.backend.model.entities.BoardingDroppingPoint;

import java.util.UUID;

public record BoardingDroppingPointResponse(
        UUID id,
        String name,
        String type,
        String address,
        String arrivalTime,
        String landmark
) {
    public static BoardingDroppingPointResponse from(BoardingDroppingPoint p) {
        return new BoardingDroppingPointResponse(
                p.getId(),
                p.getName(),
                p.getType(),
                p.getAddress(),
                p.getArrivalTime() != null ? p.getArrivalTime().toString() : null,
                p.getLandmark()
        );
    }
}
