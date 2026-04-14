package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.response.SearchResponse;
import com.tripgo.backend.dto.response.SeatAvailability;
import com.tripgo.backend.model.entities.RouteSchedule;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    private final SeatAvailabilityService seatAvailabilityService;

    public SearchResponse search(RouteSchedule schedule, String from, String to, String seatType) {
        var bus = schedule.getBus();
        if (bus == null) return null;
        var result = seatAvailabilityService.searchAvailability(schedule, from, to, seatType);
        var operator = bus.getOperator();

        return new SearchResponse(
                schedule.getId(),
                bus.getName(),
                bus.getBusCode(),
                bus.getBusType() != null ? bus.getBusType().toString() : "STANDARD",
                operator != null ? operator.getName() : "Unknown",
                schedule.getDepartureTime(),
                schedule.getArrivalTime(),
                bus.getAmenities() != null ?
                    bus.getAmenities().stream()
                        .map(a -> a.getCode())
                        .collect(Collectors.toList()) :
                    Collections.emptyList(),
                result.faresByType(),
                result.seatAvailability(),
                result.seatAvailability().size(),
                (int) result.seatAvailability().stream().filter(SeatAvailability::available).count(),
                schedule.getTripStatus() != null ? schedule.getTripStatus() : "SCHEDULED",
                schedule.getDelayMinutes() != null ? schedule.getDelayMinutes() : 0,
                schedule.getActualDepartureTime(),
                schedule.getActualArrivalTime()
        );
    }
}
