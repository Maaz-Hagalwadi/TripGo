package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.request.AddFareRequest;
import com.tripgo.backend.dto.request.AddSegmentRequest;
import com.tripgo.backend.dto.request.CreateRouteRequest;
import com.tripgo.backend.dto.request.CreateScheduleRequest;
import com.tripgo.backend.dto.response.*;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteSegmentRepository segmentRepository;
    private final FareRepository fareRepository;
    private final RouteScheduleRepository scheduleRepository;
    private final BusRepository busRepository;

    public RouteResponse createRoute(CreateRouteRequest req, User user) {
        if (user.getOperator() == null) {
            throw new RuntimeException("User not an operator");
        }

        Route route = Route.builder()
                .operator(user.getOperator())
                .name(req.name())
                .origin(req.origin())
                .destination(req.destination())
                .build();

        route = routeRepository.save(route);

        return new RouteResponse(
                route.getId(),
                route.getName(),
                route.getOrigin(),
                route.getDestination(),
                route.getDistanceKm()
        );
    }

    public BigDecimal recomputeDistance(UUID routeId, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        if (user.getOperator() == null || route.getOperator() == null ||
                !route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Not your route");
        }

        List<RouteSegment> segs = segmentRepository.findByRouteOrderBySeq(route);

        BigDecimal total = segs.stream()
                .map(RouteSegment::getDistanceKm)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        route.setDistanceKm(total);
        routeRepository.save(route);

        return total;
    }


    public SegmentResponse addSegment(UUID routeId, AddSegmentRequest req) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        Integer maxSeq = segmentRepository.findByRouteOrderBySeq(route)
                .stream()
                .map(RouteSegment::getSeq)
                .max(Integer::compareTo)
                .orElse(0);

        RouteSegment seg = segmentRepository.save(
                RouteSegment.builder()
                        .route(route)
                        .seq(maxSeq + 1)
                        .fromStop(req.fromStop())
                        .toStop(req.toStop())
                        .distanceKm(req.distanceKm())
                        .durationMinutes(req.durationMinutes())
                        .build()
        );

        return new SegmentResponse(
                seg.getId(),
                seg.getSeq(),
                seg.getFromStop(),
                seg.getToStop(),
                seg.getDistanceKm(),
                seg.getDurationMinutes()
        );
    }


    public FareResponse addFare(UUID routeId, AddFareRequest req) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        RouteSegment segment = segmentRepository.findById(req.segmentId())
                .orElseThrow(() -> new RuntimeException("Segment not found"));

        Fare fare = Fare.builder()
                .route(route)
                .routeSegment(segment)
                .seatType(req.seatType())
                .baseFare(req.baseFare())
                .gstPercent(req.gstPercent())
                .build();

        fare = fareRepository.save(fare);

        // Calculate total fare using request values to avoid lazy loading
        BigDecimal gstAmount = req.baseFare().multiply(req.gstPercent()).divide(BigDecimal.valueOf(100));
        BigDecimal totalFare = req.baseFare().add(gstAmount);

        return new FareResponse(
                fare.getId(),
                routeId,  // Use parameter instead of route.getId()
                req.segmentId(),  // Use parameter instead of segment.getId()
                req.seatType(),
                req.baseFare(),
                req.gstPercent(),
                totalFare
        );
    }

    public RouteScheduleResponse createSchedule(UUID routeId, CreateScheduleRequest req) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        Bus bus = busRepository.findById(req.busId())
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        RouteSchedule schedule = RouteSchedule.builder()
                .route(route)
                .bus(bus)
                .departureTime(req.departureTime())
                .arrivalTime(req.arrivalTime())
                .frequency(req.frequency())
                .active(true)
                .build();

        schedule = scheduleRepository.save(schedule);

        return new RouteScheduleResponse(
                schedule.getId(),
                new RouteResponse(
                        route.getId(),
                        route.getName(),
                        route.getOrigin(),
                        route.getDestination(),
                        route.getDistanceKm()
                ),
                toBusResponse(bus),
                req.departureTime(),
                req.arrivalTime(),
                req.frequency(),
                true
        );
    }

    public List<RouteResponse> listRoutes(User user) {
        if (user.getOperator() == null) {
            throw new RuntimeException("User not an operator");
        }

        return routeRepository.findByOperator(user.getOperator())
                .stream()
                .map(route -> new RouteResponse(
                        route.getId(),
                        route.getName(),
                        route.getOrigin(),
                        route.getDestination(),
                        route.getDistanceKm()
                ))
                .toList();
    }

    public List<SegmentResponse> listSegments(UUID routeId, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        if (user.getOperator() == null) {
            throw new RuntimeException("You are not an operator");
        }

        if (!route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Not your route");
        }

        return segmentRepository.findByRouteOrderBySeq(route)
                .stream()
                .map(s -> new SegmentResponse(
                        s.getId(), s.getSeq(), s.getFromStop(), s.getToStop(), s.getDistanceKm(), s.getDurationMinutes()
                ))
                .toList();
    }

    public List<RouteScheduleResponse> listSchedules(User user) {
        if (user.getOperator() == null) {
            throw new RuntimeException("User not an operator");
        }

        List<Route> routes = routeRepository.findByOperator(user.getOperator());
        
        return routes.stream()
                .flatMap(route -> scheduleRepository.findByRoute(route).stream())
                .map(schedule -> new RouteScheduleResponse(
                        schedule.getId(),
                        new RouteResponse(
                                schedule.getRoute().getId(),
                                schedule.getRoute().getName(),
                                schedule.getRoute().getOrigin(),
                                schedule.getRoute().getDestination(),
                                schedule.getRoute().getDistanceKm()
                        ),
                        toBusResponse(schedule.getBus()),
                        schedule.getDepartureTime(),
                        schedule.getArrivalTime(),
                        schedule.getFrequency(),
                        schedule.getActive()
                ))
                .toList();
    }

    public RouteScheduleResponse getSchedule(UUID scheduleId, User user) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (user.getOperator() == null || 
            !schedule.getRoute().getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        return new RouteScheduleResponse(
                schedule.getId(),
                new RouteResponse(
                        schedule.getRoute().getId(),
                        schedule.getRoute().getName(),
                        schedule.getRoute().getOrigin(),
                        schedule.getRoute().getDestination(),
                        schedule.getRoute().getDistanceKm()
                ),
                toBusResponse(schedule.getBus()),
                schedule.getDepartureTime(),
                schedule.getArrivalTime(),
                schedule.getFrequency(),
                schedule.getActive()
        );
    }

    public void deleteSchedule(UUID scheduleId, User user) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (user.getOperator() == null || 
            !schedule.getRoute().getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        schedule.setActive(false);
        scheduleRepository.save(schedule);
    }

    private BusResponse toBusResponse(Bus bus) {
        return new BusResponse(
                bus.getId(),
                bus.getName(),
                bus.getBusCode(),
                bus.getVehicleNumber(),
                bus.getModel(),
                bus.getBusType(),
                bus.getTotalSeats(),
                bus.isActive(),
                bus.getAmenities().stream()
                        .map(a -> new AmenityDTO(
                                a.getId(),
                                a.getCode(),
                                a.getDescription()
                        ))
                        .toList()
        );
    }

    public void deleteRoute(UUID routeId, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        if (user.getOperator() == null || 
            !route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        // Delete associated schedules, segments, and fares
        scheduleRepository.deleteAll(scheduleRepository.findByRoute(route));
        fareRepository.deleteAll(fareRepository.findByRoute(route));
        segmentRepository.deleteAll(segmentRepository.findByRouteOrderBySeq(route));
        
        // Delete the route
        routeRepository.delete(route);
    }
}
