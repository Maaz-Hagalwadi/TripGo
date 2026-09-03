package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.response.FareResult;
import com.tripgo.backend.dto.response.SeatAvailability;
import com.tripgo.backend.dto.response.SearchResult;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeatAvailabilityService {

    private final RouteSegmentRepository segmentRepo;
    private final FareRepository fareRepo;
    private final SeatRepository seatRepo;
    private final BookingSeatRepository bookingSeatRepo;

    @Transactional(readOnly = true)
    public SearchResult searchAvailability(RouteSchedule schedule, String from, String to, String seatType) {

        List<RouteSegment> segments = segmentRepo.findByRouteOrderBySeq(schedule.getRoute());

        int startIdx = indexOf(segments, from);
        int endIdx = indexOf(segments, to);

        if (startIdx == -1 || endIdx == -1 || endIdx <= startIdx) {
            throw new RuntimeException("Invalid stop selection: Could not find '" + from + "' or '" + to + "' in route segments");
        }

        List<RouteSegment> travelSegments = segments.subList(startIdx, endIdx);
        UUID busId = schedule.getBus() != null ? schedule.getBus().getId() : null;

        // Load all fares for all travel segments in one query, then group in memory
        List<UUID> segmentIds = travelSegments.stream().map(RouteSegment::getId).toList();
        Map<UUID, List<Fare>> faresBySegmentId = fareRepo.findByRouteSegmentIdIn(segmentIds)
                .stream()
                .collect(Collectors.groupingBy(f -> f.getRouteSegment().getId()));

        // Collect seat types from the pre-loaded fares (bus-specific first, then route-level)
        Set<String> seatTypes = new java.util.LinkedHashSet<>();
        for (RouteSegment seg : travelSegments) {
            List<Fare> segFares = faresBySegmentId.getOrDefault(seg.getId(), List.of());
            segFares.stream()
                    .map(Fare::getSeatType)
                    .filter(t -> t != null && !t.isBlank())
                    .forEach(seatTypes::add);
        }

        // Build fare map: seatType -> FareResult (priority: bus-specific > route-level > any)
        Map<String, FareResult> faresByType = new java.util.LinkedHashMap<>();
        for (String type : seatTypes) {
            BigDecimal base = BigDecimal.ZERO;
            BigDecimal gst = BigDecimal.ZERO;
            boolean complete = true;
            for (RouteSegment seg : travelSegments) {
                List<Fare> segFares = faresBySegmentId.getOrDefault(seg.getId(), List.of());
                Optional<Fare> fare = busId != null
                        ? segFares.stream().filter(f -> type.equals(f.getSeatType()) && f.getBus() != null && busId.equals(f.getBus().getId())).findFirst()
                        : Optional.empty();
                if (fare.isEmpty()) {
                    fare = segFares.stream().filter(f -> type.equals(f.getSeatType()) && f.getBus() == null).findFirst();
                }
                if (fare.isEmpty()) {
                    fare = segFares.stream().filter(f -> type.equals(f.getSeatType())).findFirst();
                }
                if (fare.isEmpty()) { complete = false; break; }
                base = base.add(fare.get().getBaseFare());
                gst = gst.add(fare.get().getBaseFare()
                        .multiply(fare.get().getGstPercent())
                        .divide(BigDecimal.valueOf(100)));
            }
            if (complete) faresByType.put(type, new FareResult(base, gst, base.add(gst)));
        }

        if (faresByType.isEmpty()) {
            throw new RuntimeException("No fares defined for route: " + from + " -> " + to);
        }

        // Seat availability — load only CONFIRMED seats, then filter by date in Java
        List<Seat> seats = seatRepo.findByBus(schedule.getBus());

        List<BookingSeat> allBookingSeats = bookingSeatRepo
                .findConfirmedByRouteSchedule(schedule)
                .stream()
                .filter(bs -> {
                    if (schedule.getFrequency() != null) {
                        java.time.LocalDate bookingDate = bs.getBooking().getTravelDate();
                        if (bookingDate == null) return true;
                        java.time.LocalDate requestedDate = java.time.LocalDateTime
                                .ofInstant(schedule.getDepartureTime(), java.time.ZoneOffset.UTC)
                                .toLocalDate();
                        return bookingDate.equals(requestedDate);
                    }
                    return true;
                })
                .toList();

        // Build a set of seat numbers that overlap with the requested from->to segment range
        Set<String> unavailableSeats = allBookingSeats.stream()
                .filter(bs -> segmentsOverlap(segments, bs.getFromStop(), bs.getToStop(), from, to))
                .map(BookingSeat::getSeatNumber)
                .collect(Collectors.toSet());

        List<SeatAvailability> seatAvailability = seats.stream()
                .map(seat -> new SeatAvailability(
                        seat.getSeatNumber(),
                        !unavailableSeats.contains(seat.getSeatNumber())
                        && !Boolean.TRUE.equals(seat.getIsBlocked())
                ))
                .toList();

        return new SearchResult(faresByType, seatAvailability);
    }

    // Returns true if booking segment [bookedFrom->bookedTo] overlaps with requested [reqFrom->reqTo]
    private boolean segmentsOverlap(List<RouteSegment> segments, String bookedFrom, String bookedTo,
                                     String reqFrom, String reqTo) {
        int bookedStart = indexOf(segments, bookedFrom);
        int bookedEnd   = indexOf(segments, bookedTo);
        int reqStart    = indexOf(segments, reqFrom);
        int reqEnd      = indexOf(segments, reqTo);
        if (bookedStart == -1 || bookedEnd == -1 || reqStart == -1 || reqEnd == -1) return false;
        // Overlap exists if one range starts before the other ends
        return bookedStart < reqEnd && bookedEnd > reqStart;
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