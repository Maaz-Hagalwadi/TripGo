package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.BoardingDroppingPointRequest;
import com.tripgo.backend.dto.request.CreateScheduleRequest;
import com.tripgo.backend.dto.response.BoardingDroppingPointResponse;
import com.tripgo.backend.dto.response.RouteScheduleResponse;
import com.tripgo.backend.model.entities.BoardingDroppingPoint;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.BoardingDroppingPointRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.RouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/operator/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final RouteService routeService;
    private final BoardingDroppingPointRepository pointRepository;
    private final RouteScheduleRepository scheduleRepository;

    @GetMapping
    public List<RouteScheduleResponse> listSchedules(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.listSchedules(user);
    }

    @GetMapping("/{scheduleId}")
    public RouteScheduleResponse getSchedule(@PathVariable UUID scheduleId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.getSchedule(scheduleId, user);
    }

    @PutMapping("/{scheduleId}")
    public RouteScheduleResponse updateSchedule(@PathVariable UUID scheduleId,
                                                @RequestBody CreateScheduleRequest req,
                                                Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return routeService.updateSchedule(scheduleId, req, user);
    }

    @DeleteMapping("/{scheduleId}")
    public void deleteSchedule(@PathVariable UUID scheduleId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        routeService.deleteSchedule(scheduleId, user);
    }

    @GetMapping("/{scheduleId}/points")
    public ResponseEntity<?> getPoints(@PathVariable UUID scheduleId, Authentication auth) {
        RouteSchedule schedule = getScheduleOwnedBy(scheduleId, auth);
        return ResponseEntity.ok(
                pointRepository.findByScheduleOrderByTypeAscArrivalTimeAsc(schedule)
                        .stream().map(BoardingDroppingPointResponse::from).toList()
        );
    }

    @PostMapping("/{scheduleId}/points")
    public ResponseEntity<?> addPoint(@PathVariable UUID scheduleId,
                                      @Valid @RequestBody BoardingDroppingPointRequest req,
                                      Authentication auth) {
        RouteSchedule schedule = getScheduleOwnedBy(scheduleId, auth);

        BoardingDroppingPoint point = BoardingDroppingPoint.builder()
                .schedule(schedule)
                .name(req.name())
                .type(req.type())
                .address(req.address())
                .landmark(req.landmark())
                .arrivalTime(req.arrivalTime() != null
                        ? LocalTime.parse(req.arrivalTime(), DateTimeFormatter.ofPattern("HH:mm"))
                        : null)
                .build();

        return ResponseEntity.ok(BoardingDroppingPointResponse.from(pointRepository.save(point)));
    }

    @DeleteMapping("/{scheduleId}/points/{pointId}")
    public ResponseEntity<?> deletePoint(@PathVariable UUID scheduleId,
                                         @PathVariable UUID pointId,
                                         Authentication auth) {
        getScheduleOwnedBy(scheduleId, auth);
        BoardingDroppingPoint point = pointRepository.findById(pointId)
                .filter(p -> p.getSchedule().getId().equals(scheduleId))
                .orElseThrow(() -> new RuntimeException("Point not found"));
        pointRepository.delete(point);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PutMapping("/{scheduleId}/points/{pointId}")
    public ResponseEntity<?> updatePoint(@PathVariable UUID scheduleId,
                                         @PathVariable UUID pointId,
                                         @Valid @RequestBody BoardingDroppingPointRequest req,
                                         Authentication auth) {
        getScheduleOwnedBy(scheduleId, auth);
        BoardingDroppingPoint point = pointRepository.findById(pointId)
                .filter(p -> p.getSchedule().getId().equals(scheduleId))
                .orElseThrow(() -> new RuntimeException("Point not found"));

        point.setName(req.name());
        point.setType(req.type());
        point.setAddress(req.address());
        point.setLandmark(req.landmark());
        point.setArrivalTime(req.arrivalTime() != null
                ? LocalTime.parse(req.arrivalTime(), DateTimeFormatter.ofPattern("HH:mm"))
                : null);

        return ResponseEntity.ok(BoardingDroppingPointResponse.from(pointRepository.save(point)));
    }

    private RouteSchedule getScheduleOwnedBy(UUID scheduleId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));
        if (user.getOperator() == null ||
                !schedule.getRoute().getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Not your schedule");
        }
        return schedule;
    }
}
