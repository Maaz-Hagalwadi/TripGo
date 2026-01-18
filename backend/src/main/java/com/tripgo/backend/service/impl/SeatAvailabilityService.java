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

        int startIdx = indexOf(segments, from);
        int endIdx = indexOf(segments, to);

        if (startIdx == -1 || endIdx == -1 || endIdx <= startIdx) {
            throw new RuntimeException("Invalid stop selection");
        }

        // 1. Fare Calculation
        BigDecimal base = BigDecimal.ZERO;
        BigDecimal gst = BigDecimal.ZERO;

        for (int i = startIdx; i < endIdx; i++) {
            Fare fare = fareRepo.findByRouteSegmentIdAndSeatType(segments.get(i).getId(), seatType)
                    .orElseThrow(() -> new RuntimeException("Fare not defined"));

            base = base.add(fare.getBaseFare());
            gst = gst.add(fare.getBaseFare()
                    .multiply(fare.getGstPercent())
                    .divide(BigDecimal.valueOf(100)));
        }

        BigDecimal total = base.add(gst);

        FareResult fareResult = new FareResult(base, gst, total);

        // 2. Seat Availability (reuse logic)
        List<Seat> seats = seatRepo.findByBus(schedule.getBus());
        List<BookingSeat> booked = bookingSeatRepo.findByRouteSchedule(schedule);

        List<SeatAvailability> seatAvailability = seats.stream().map(seat -> {
            boolean available = booked.stream().noneMatch(b -> {
                int bStart = indexOf(segments, b.getFromStop());
                int bEnd = indexOf(segments, b.getToStop());
                return (startIdx < bEnd) && (bStart < endIdx);
            });

            return new SeatAvailability(seat.getSeatNumber(), available);
        }).toList();

        return new SearchResult(fareResult, seatAvailability);
    }

    private int indexOf(List<RouteSegment> segs, String stop) {
        for (int i = 0; i < segs.size(); i++) {
            if (segs.get(i).getFromStop().equalsIgnoreCase(stop)) return i;
        }
        return -1;
    }
}