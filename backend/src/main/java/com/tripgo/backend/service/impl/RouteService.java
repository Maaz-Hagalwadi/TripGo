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
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteSegmentRepository segmentRepository;
    private final FareRepository fareRepository;
    private final RouteScheduleRepository scheduleRepository;
    private final BusRepository busRepository;
    private final BusDriverAssignmentRepository assignmentRepository;

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

        // Resolve bus if busId provided
        Bus bus = null;
        if (req.busId() != null) {
            bus = busRepository.findById(req.busId())
                    .orElseThrow(() -> new RuntimeException("Bus not found"));
        }

        // If setting a per-bus fare, ensure route-level fare still exists
        if (bus != null) {
            boolean routeLevelExists = fareRepository
                    .findByRouteSegmentIdAndSeatType(segment.getId(), req.seatType())
                    .isPresent();
            if (!routeLevelExists) {
                // Create route-level fare with same price as default
                fareRepository.save(Fare.builder()
                        .route(route)
                        .routeSegment(segment)
                        .bus(null)
                        .seatType(req.seatType())
                        .baseFare(req.baseFare())
                        .gstPercent(req.gstPercent())
                        .build());
            }
        }

        // Check if fare already exists for this segment+seatType+bus, update it
        final Bus finalBus = bus;
        Optional<Fare> existing = bus != null
                ? fareRepository.findByRouteSegmentIdAndSeatTypeAndBusId(segment.getId(), req.seatType(), bus.getId())
                : fareRepository.findByRouteSegmentIdAndSeatType(segment.getId(), req.seatType());

        Fare fare;
        if (existing.isPresent()) {
            fare = existing.get();
            fare.setBaseFare(req.baseFare());
            fare.setGstPercent(req.gstPercent());
        } else {
            fare = Fare.builder()
                    .route(route)
                    .routeSegment(segment)
                    .bus(finalBus)
                    .seatType(req.seatType())
                    .baseFare(req.baseFare())
                    .gstPercent(req.gstPercent())
                    .build();
        }

        fare = fareRepository.save(fare);

        BigDecimal gstAmount = req.baseFare().multiply(req.gstPercent()).divide(BigDecimal.valueOf(100));
        BigDecimal totalFare = req.baseFare().add(gstAmount);

        return new FareResponse(
                fare.getId(),
                routeId,
                req.segmentId(),
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
        return toScheduleResponse(schedule);
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
                .map(this::toScheduleResponse)
                .toList();
    }

    public RouteScheduleResponse getSchedule(UUID scheduleId, User user) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (user.getOperator() == null ||
            !schedule.getRoute().getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        return toScheduleResponse(schedule);
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

    public RouteScheduleResponse updateSchedule(UUID scheduleId, CreateScheduleRequest req, User user) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (user.getOperator() == null ||
            !schedule.getRoute().getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        Bus bus = busRepository.findById(req.busId())
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        schedule.setBus(bus);
        schedule.setDepartureTime(req.departureTime());
        schedule.setArrivalTime(req.arrivalTime());
        schedule.setFrequency(req.frequency());
        scheduleRepository.save(schedule);

        return toScheduleResponse(schedule);
    }

    private RouteScheduleResponse toScheduleResponse(RouteSchedule schedule) {
        Route route = schedule.getRoute();

        // Get assigned driver for this bus
        UUID driverId = null;
        String driverName = null;
        var assignment = assignmentRepository.findByBusAndAssignedToIsNull(schedule.getBus());
        if (assignment.isPresent()) {
            Driver driver = assignment.get().getDriver();
            driverId = driver.getId();
            driverName = driver.getFirstName() + " " + (driver.getLastName() != null ? driver.getLastName() : "");
        }

        return new RouteScheduleResponse(
                schedule.getId(),
                new RouteResponse(route.getId(), route.getName(), route.getOrigin(), route.getDestination(), route.getDistanceKm()),
                toBusResponse(schedule.getBus()),
                schedule.getDepartureTime(),
                schedule.getArrivalTime(),
                schedule.getFrequency(),
                Boolean.TRUE.equals(schedule.getActive()),
                driverId,
                driverName,
                schedule.getTripStatus() != null ? schedule.getTripStatus() : "SCHEDULED",
                schedule.getDelayMinutes(),
                schedule.getDelayReason(),
                schedule.getActualDepartureTime(),
                schedule.getActualArrivalTime()
        );
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
                        .toList(),
                bus.getCreatedAt(),
                bus.getUpdatedAt()
        );
    }

    public FareResponse updateFare(UUID routeId, UUID fareId, AddFareRequest req) {
        Fare fare = fareRepository.findById(fareId)
                .filter(f -> f.getRoute().getId().equals(routeId))
                .orElseThrow(() -> new RuntimeException("Fare not found"));

        fare.setBaseFare(req.baseFare());
        fare.setGstPercent(req.gstPercent());
        fare.setSeatType(req.seatType());

        if (req.segmentId() != null) {
            RouteSegment segment = segmentRepository.findById(req.segmentId())
                    .orElseThrow(() -> new RuntimeException("Segment not found"));
            fare.setRouteSegment(segment);
        }

        fare = fareRepository.save(fare);

        BigDecimal gstAmount = fare.getBaseFare().multiply(fare.getGstPercent()).divide(BigDecimal.valueOf(100));
        BigDecimal totalFare = fare.getBaseFare().add(gstAmount);

        return new FareResponse(
                fare.getId(),
                routeId,
                fare.getRouteSegment() != null ? fare.getRouteSegment().getId() : null,
                fare.getSeatType(),
                fare.getBaseFare(),
                fare.getGstPercent(),
                totalFare
        );
    }

    public void deleteRoute(UUID routeId, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        if (user.getOperator() == null || 
            !route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        // Delete associated data
        scheduleRepository.findByRoute(route).forEach(scheduleRepository::delete);
        segmentRepository.findByRouteOrderBySeq(route).forEach(segment -> {
            fareRepository.findByRouteSegment(segment).forEach(fareRepository::delete);
            segmentRepository.delete(segment);
        });
        
        // Delete the route
        routeRepository.delete(route);
    }
}
