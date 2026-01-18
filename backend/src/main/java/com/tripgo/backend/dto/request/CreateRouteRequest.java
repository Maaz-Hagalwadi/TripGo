package com.tripgo.backend.dto.request;

public record CreateRouteRequest(
        String name,
        String origin,
        String destination
) {}
