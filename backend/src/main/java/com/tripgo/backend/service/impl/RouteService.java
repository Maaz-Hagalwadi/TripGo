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
import com.tripgo.backend.exception.BadRequestException;
import com.tripgo.backend.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
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
    private final com.tripgo.backend.repository.BookingRepository bookingRepository;

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

    public SegmentResponse updateSegment(UUID routeId, UUID segmentId, AddSegmentRequest req, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        if (user.getOperator() == null ||
                !route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        RouteSegment seg = segmentRepository.findById(segmentId)
                .filter(s -> s.getRoute().getId().equals(routeId))
                .orElseThrow(() -> new ResourceNotFoundException("Stretch not found"));

        boolean renamed = !seg.getFromStop().equalsIgnoreCase(String.valueOf(req.fromStop()).trim())
                || !seg.getToStop().equalsIgnoreCase(String.valueOf(req.toStop()).trim());
        if (renamed && routeHasBookings(route)) {
            throw new BadRequestException("Stops can't be renamed once travellers have booked this route — their tickets name these stops. You can still change distance and time.");
        }

        seg.setFromStop(req.fromStop().trim());
        seg.setToStop(req.toStop().trim());
        seg.setDistanceKm(req.distanceKm());
        seg.setDurationMinutes(req.durationMinutes());
        segmentRepository.save(seg);

        return new SegmentResponse(seg.getId(), seg.getSeq(), seg.getFromStop(), seg.getToStop(), seg.getDistanceKm(), seg.getDurationMinutes());
    }

    public void deleteSegment(UUID routeId, UUID segmentId, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        if (user.getOperator() == null ||
                !route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        RouteSegment seg = segmentRepository.findById(segmentId)
                .filter(s -> s.getRoute().getId().equals(routeId))
                .orElseThrow(() -> new ResourceNotFoundException("Stretch not found"));

        if (routeHasBookings(route)) {
            throw new BadRequestException("Stops can't be removed once travellers have booked this route.");
        }
        fareRepository.findByRouteSegment(seg).forEach(fareRepository::delete);
        segmentRepository.delete(seg);
    }

    private boolean routeHasBookings(Route route) {
        return scheduleRepository.findByRoute(route).stream().anyMatch(bookingRepository::existsByRouteSchedule);
    }

    public RouteResponse updateRoute(UUID routeId, CreateRouteRequest req, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        if (user.getOperator() == null ||
                !route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        route.setName(req.name());
        route.setOrigin(req.origin());
        route.setDestination(req.destination());
        routeRepository.save(route);

        return new RouteResponse(route.getId(), route.getName(), route.getOrigin(), route.getDestination(), route.getDistanceKm());
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


    private static final java.util.Set<String> FREQUENCIES = java.util.Set.of("DAILY", "WEEKDAYS", "WEEKENDS", "WEEKLY", "ONCE");

    /** The route, if it belongs to the caller's operator account. Every route write goes through this. */
    public Route requireOwnedRoute(UUID routeId, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found"));
        if (user == null || user.getOperator() == null || route.getOperator() == null
                || !route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new AccessDeniedException("This route belongs to another operator");
        }
        return route;
    }

    /** Checks a create/update schedule request and returns its bus. */
    private Bus validateSchedule(Route route, CreateScheduleRequest req, User user) {
        if (req.busId() == null || req.departureTime() == null || req.arrivalTime() == null) {
            throw new BadRequestException("Bus, departure time and arrival time are required");
        }
        Bus bus = busRepository.findById(req.busId())
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found"));
        if (bus.getOperator() == null || !bus.getOperator().getId().equals(user.getOperator().getId())) {
            throw new AccessDeniedException("This bus belongs to another operator");
        }
        if (!bus.isActive()) {
            throw new BadRequestException(bus.getName() + " is still waiting for admin approval");
        }
        if (!req.arrivalTime().isAfter(req.departureTime())) {
            throw new BadRequestException("Arrival must be after departure");
        }
        if (java.time.Duration.between(req.departureTime(), req.arrivalTime()).toHours() > 72) {
            throw new BadRequestException("A trip can't be longer than 72 hours — check the arrival date");
        }
        if (req.frequency() != null && !FREQUENCIES.contains(req.frequency())) {
            throw new BadRequestException("Unknown frequency " + req.frequency());
        }
        if (segmentRepository.findByRouteOrderBySeq(route).isEmpty()) {
            throw new BadRequestException("Add this route's stops before scheduling a departure");
        }
        return bus;
    }

    public SegmentResponse addSegment(UUID routeId, AddSegmentRequest req, User user) {
        Route route = requireOwnedRoute(routeId, user);
        if (req.fromStop() == null || req.fromStop().isBlank() || req.toStop() == null || req.toStop().isBlank()) {
            throw new BadRequestException("Both stops are required");
        }
        if (req.fromStop().trim().equalsIgnoreCase(req.toStop().trim())) {
            throw new BadRequestException("A stop can't lead to itself");
        }

        Integer maxSeq = segmentRepository.findByRouteOrderBySeq(route)
                .stream()
                .map(RouteSegment::getSeq)
                .max(Integer::compareTo)
                .orElse(0);

        RouteSegment seg = segmentRepository.save(
                RouteSegment.builder()
                        .route(route)
                        .seq(maxSeq + 1)
                        .fromStop(req.fromStop().trim())
                        .toStop(req.toStop().trim())
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


    public FareResponse addFare(UUID routeId, AddFareRequest req, User user) {
        Route route = requireOwnedRoute(routeId, user);
        if (req.segmentId() == null || req.seatType() == null || req.seatType().isBlank()) {
            throw new BadRequestException("Stretch and seat type are required");
        }
        if (req.baseFare() == null || req.baseFare().signum() <= 0) {
            throw new BadRequestException("Fare must be more than ₹0");
        }
        if (req.gstPercent() != null && (req.gstPercent().signum() < 0 || req.gstPercent().compareTo(BigDecimal.valueOf(28)) > 0)) {
            throw new BadRequestException("GST must be between 0% and 28%");
        }
        req = new AddFareRequest(req.segmentId(), req.seatType().trim().toUpperCase(), req.baseFare(),
                req.gstPercent() != null ? req.gstPercent() : BigDecimal.valueOf(5), req.busId());

        RouteSegment segment = segmentRepository.findById(req.segmentId())
                .filter(sg -> sg.getRoute().getId().equals(routeId))
                .orElseThrow(() -> new ResourceNotFoundException("Stretch not found on this route"));

        // Resolve bus if busId provided
        Bus bus = null;
        if (req.busId() != null) {
            bus = busRepository.findById(req.busId())
                    .filter(b -> b.getOperator() != null && b.getOperator().getId().equals(user.getOperator().getId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Bus not found"));
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
                totalFare,
                fare.getBus() != null ? fare.getBus().getId() : null
        );
    }

    public RouteScheduleResponse createSchedule(UUID routeId, CreateScheduleRequest req, User user) {
        Route route = requireOwnedRoute(routeId, user);
        Bus bus = validateSchedule(route, req, user);
        if (req.departureTime().isBefore(java.time.Instant.now())) {
            throw new BadRequestException("The first departure must be in the future");
        }

        RouteSchedule schedule = RouteSchedule.builder()
                .route(route)
                .bus(bus)
                .departureTime(req.departureTime())
                .arrivalTime(req.arrivalTime())
                .frequency(req.frequency() != null ? req.frequency() : "ONCE")
                .active(true)
                .tripStatus("SCHEDULED")
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

        // Bookings must never disappear with their schedule (see V63)
        if (bookingRepository.existsByRouteSchedule(schedule)) {
            throw new BadRequestException("This schedule has bookings, so it can't be deleted. Switch it off instead to stop new bookings — existing travellers keep their tickets.");
        }
        scheduleRepository.delete(schedule);
    }

    /** Stops (or resumes) sales for a schedule without touching its bookings. */
    public RouteScheduleResponse setScheduleActive(UUID scheduleId, boolean active, User user) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));
        if (user.getOperator() == null ||
            !schedule.getRoute().getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }
        schedule.setActive(active);
        scheduleRepository.save(schedule);
        return toScheduleResponse(schedule);
    }

    public RouteScheduleResponse updateSchedule(UUID scheduleId, CreateScheduleRequest req, User user) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (user.getOperator() == null ||
            !schedule.getRoute().getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        if ("STARTED".equals(schedule.getTripStatus())) {
            throw new BadRequestException("This trip is on the road — edit it after it's completed");
        }
        Bus bus = validateSchedule(schedule.getRoute(), req, user);

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
        if (schedule.getBus() != null) {
            var assignment = assignmentRepository.findByBusAndAssignedToIsNull(schedule.getBus());
            if (assignment.isPresent()) {
                Driver driver = assignment.get().getDriver();
                driverId = driver.getId();
                driverName = driver.getFirstName() + " " + (driver.getLastName() != null ? driver.getLastName() : "");
            }
        }

        return new RouteScheduleResponse(
                schedule.getId(),
                new RouteResponse(route.getId(), route.getName(), route.getOrigin(), route.getDestination(), route.getDistanceKm()),
                schedule.getBus() != null ? toBusResponse(schedule.getBus()) : null,
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

    public FareResponse updateFare(UUID routeId, UUID fareId, AddFareRequest req, User user) {
        requireOwnedRoute(routeId, user);
        if (req.baseFare() == null || req.baseFare().signum() <= 0) {
            throw new BadRequestException("Fare must be more than ₹0");
        }
        Fare fare = fareRepository.findById(fareId)
                .filter(f -> f.getRoute().getId().equals(routeId))
                .orElseThrow(() -> new RuntimeException("Fare not found"));

        fare.setBaseFare(req.baseFare());
        if (req.gstPercent() != null) fare.setGstPercent(req.gstPercent());
        if (req.seatType() != null && !req.seatType().isBlank()) fare.setSeatType(req.seatType().trim().toUpperCase());

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
                totalFare,
                fare.getBus() != null ? fare.getBus().getId() : null
        );
    }

    public void deleteRoute(UUID routeId, User user) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        if (user.getOperator() == null || 
            !route.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        List<RouteSchedule> schedules = scheduleRepository.findByRoute(route);
        if (schedules.stream().anyMatch(bookingRepository::existsByRouteSchedule)) {
            throw new BadRequestException("This route has bookings, so it can't be deleted. Switch off its schedules instead to stop new bookings.");
        }

        // Delete associated data
        schedules.forEach(scheduleRepository::delete);
        segmentRepository.findByRouteOrderBySeq(route).forEach(segment -> {
            fareRepository.findByRouteSegment(segment).forEach(fareRepository::delete);
            segmentRepository.delete(segment);
        });
        
        // Delete the route
        routeRepository.delete(route);
    }
}
