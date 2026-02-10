package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.response.FareResult;
import com.tripgo.backend.dto.response.SeatAvailability;
import com.tripgo.backend.dto.response.SearchResult;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SeatAvailabilityService {

    private final RouteSegmentRepository segmentRepo;
    private final FareRepository fareRepo;
    private final SeatRepository seatRepo;
    private final BookingSeatRepository bookingSeatRepo;

    public SearchResult searchAvailability(RouteSchedule schedule, String from, String to, String seatType) {

        List<RouteSegment> segments = segmentRepo.findByRouteOrderBySeq(schedule.getRoute());
        
        System.out.println("🔍 Searching availability for: " + from + " -> " + to);
        System.out.println("📋 Route segments:");
        for (int i = 0; i < segments.size(); i++) {
            RouteSegment seg = segments.get(i);
            System.out.println("  [" + i + "] " + seg.getFromStop() + " -> " + seg.getToStop());
        }

        int startIdx = indexOf(segments, from);
        int endIdx = indexOf(segments, to);
        
        System.out.println("📍 Start index: " + startIdx + ", End index: " + endIdx);

        if (startIdx == -1 || endIdx == -1 || endIdx <= startIdx) {
            System.out.println("❌ Invalid stop selection: startIdx=" + startIdx + ", endIdx=" + endIdx);
            throw new RuntimeException("Invalid stop selection: Could not find '" + from + "' or '" + to + "' in route segments");
        }

        // 1. Fare Calculation
        BigDecimal base = BigDecimal.ZERO;
        BigDecimal gst = BigDecimal.ZERO;
        final String searchSeatType = (seatType != null) ? seatType : "AC_SLEEPER"; // Default seat type

        for (int i = startIdx; i < endIdx; i++) {
            RouteSegment segment = segments.get(i);
            System.out.println("💰 Looking for fare: segment=" + segment.getId() + ", seatType=" + searchSeatType);
            Fare fare = fareRepo.findByRouteSegmentIdAndSeatType(segment.getId(), searchSeatType)
                    .orElseThrow(() -> new RuntimeException("Fare not defined for segment: " + segment.getFromStop() + " -> " + segment.getToStop() + ", seatType: " + searchSeatType));

            base = base.add(fare.getBaseFare());
            gst = gst.add(fare.getBaseFare()
                    .multiply(fare.getGstPercent())
                    .divide(BigDecimal.valueOf(100)));
        }

        BigDecimal total = base.add(gst);

        FareResult fareResult = new FareResult(base, gst, total);

        // 2. Seat Availability (simplified - assume all seats available for now)
        List<Seat> seats = seatRepo.findByBus(schedule.getBus());
        
        List<SeatAvailability> seatAvailability = seats.stream()
                .map(seat -> new SeatAvailability(seat.getSeatNumber(), true)) // All seats available
                .toList();

        return new SearchResult(fareResult, seatAvailability);
    }

    private int indexOf(List<RouteSegment> segs, String stop) {
        // Check if stop is a fromStop
        for (int i = 0; i < segs.size(); i++) {
            if (segs.get(i).getFromStop().equalsIgnoreCase(stop)) {
                return i;
            }
        }
        
        // Check if stop is a toStop (for destination)
        for (int i = 0; i < segs.size(); i++) {
            if (segs.get(i).getToStop().equalsIgnoreCase(stop)) {
                return i + 1; // Return next index for destination
            }
        }
        
        return -1;
    }
}