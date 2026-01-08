package com.tripgo.backend.dto.request;

public record OperatorRegistrationRequest(
        String firstName,
        String lastName,
        String email,
        String phone,
        String password,
        String operatorName,
        String contactPhone,
        String address
) {}

