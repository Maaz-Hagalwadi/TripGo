package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.response.SearchResponse;
import com.tripgo.backend.model.entities.RouteSchedule;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    private final SeatAvailabilityService seatAvailabilityService;

    public SearchResponse search(RouteSchedule schedule, String from, String to, String seatType) {
        var result = seatAvailabilityService.searchAvailability(schedule, from, to, seatType);
        
        return new SearchResponse(
                result.fareResult(),
                result.seatAvailability()
        );
    }
}