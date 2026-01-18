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
    private  final RouteRepository routeRepository;
    private final RouteSegmentRepository segmentRepository;

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



}
