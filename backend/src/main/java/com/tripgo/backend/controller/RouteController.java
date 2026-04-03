package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.AddFareRequest;
import com.tripgo.backend.dto.request.AddSegmentRequest;
import com.tripgo.backend.dto.request.CreateRouteRequest;
import com.tripgo.backend.dto.request.CreateScheduleRequest;
import com.tripgo.backend.dto.response.RouteResponse;
import com.tripgo.backend.dto.response.FareResponse;
import com.tripgo.backend.dto.response.RouteScheduleResponse;
import com.tripgo.backend.dto.response.SegmentResponse;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.model.entities.Fare;
import com.tripgo.backend.repository.FareRepository;
import com.tripgo.backend.repository.RouteRepository;
import com.tripgo.backend.repository.RouteSegmentRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/operator/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;
    private final RouteRepository routeRepository;
    private final RouteSegmentRepository segmentRepository;
    private final FareRepository fareRepository;

    @PostMapping
    public RouteResponse createRoute(@RequestBody CreateRouteRequest req, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.createRoute(req, user);
    }

    @GetMapping
    public List<RouteResponse> listRoutes(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.listRoutes(user);
    }

    @PostMapping("/{routeId}/segments")
    public SegmentResponse addSegment(
            @PathVariable UUID routeId,
            @RequestBody AddSegmentRequest req,
            Authentication auth
    ) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.addSegment(routeId, req);
    }


    @GetMapping("/{routeId}/fares")
    public List<FareResponse> listFares(@PathVariable UUID routeId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));
        return fareRepository.findByRouteOrderBySeatType(route).stream()
                .map(f -> new FareResponse(
                        f.getId(),
                        f.getRoute().getId(),
                        f.getRouteSegment() != null ? f.getRouteSegment().getId() : null,
                        f.getSeatType(),
                        f.getBaseFare(),
                        f.getGstPercent(),
                        f.getBaseFare() != null && f.getGstPercent() != null
                                ? f.getBaseFare().add(f.getBaseFare().multiply(f.getGstPercent().divide(java.math.BigDecimal.valueOf(100))))
                                : f.getBaseFare()
                ))
                .toList();
    }

    @PostMapping("/{routeId}/fares")
    public FareResponse addFare(@PathVariable UUID routeId,
                        @RequestBody AddFareRequest req) {
        return routeService.addFare(routeId, req);
    }

    @PostMapping("/{routeId}/schedule")
    public RouteScheduleResponse createSchedule(@PathVariable UUID routeId,
                                        @RequestBody CreateScheduleRequest req) {
        return routeService.createSchedule(routeId, req);
    }

    @PatchMapping("/{routeId}/recompute-distance")
    public Map<String, Object> recompute(@PathVariable UUID routeId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        BigDecimal total = routeService.recomputeDistance(routeId, user);

        return Map.of(
                "routeId", routeId,
                "totalDistanceKm", total
        );
    }

    @GetMapping("/{routeId}/segments")
    public List<SegmentResponse> listSegments(@PathVariable UUID routeId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.listSegments(routeId, user);
    }

    @PutMapping("/{routeId}/fares/{fareId}")
    public FareResponse updateFare(@PathVariable UUID routeId,
                                   @PathVariable UUID fareId,
                                   @RequestBody AddFareRequest req,
                                   Authentication auth) {
        return routeService.updateFare(routeId, fareId, req);
    }

    @DeleteMapping("/{routeId}/fares/{fareId}")
    public ResponseEntity<Void> deleteFare(@PathVariable UUID routeId,
                                           @PathVariable UUID fareId,
                                           Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Fare fare = fareRepository.findById(fareId)
                .filter(f -> f.getRoute().getId().equals(routeId))
                .orElseThrow(() -> new RuntimeException("Fare not found"));
        fareRepository.delete(fare);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{routeId}")
    public ResponseEntity<Void> deleteRoute(@PathVariable UUID routeId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        routeService.deleteRoute(routeId, user);
        return ResponseEntity.ok().build();
    }
}
