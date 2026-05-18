package com.tripgo.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class RescheduleRequest {
    private LocalDate newTravelDate;
    private List<String> newSeatNumbers;
}
