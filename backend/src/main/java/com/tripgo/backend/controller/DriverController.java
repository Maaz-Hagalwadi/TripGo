package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/operator/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverRepository driverRepository;
    private final BusRepository busRepository;
    private final RouteScheduleRepository scheduleRepository;
    private final BusDriverAssignmentRepository assignmentRepository;

    // POST /operator/drivers - Add driver
    @PostMapping
    public ResponseEntity<?> addDriver(@RequestBody Map<String, Object> body, Authentication auth) {
        Operator operator = getOperator(auth);

        String licenseNumber = (String) body.get("licenseNumber");

        // Prevent duplicate license
        if (driverRepository.existsByLicenseNumberAndOperator(licenseNumber, operator)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Driver with this license already exists"));
        }

        Driver driver = Driver.builder()
                .firstName((String) body.get("firstName"))
                .lastName((String) body.get("lastName"))
                .phone((String) body.get("phone"))
                .licenseNumber(licenseNumber)
                .licenseExpiry(body.get("licenseExpiry") != null ?
                        LocalDate.parse((String) body.get("licenseExpiry")) : null)
                .operator(operator)
                .build();

        driver = driverRepository.save(driver);

        return ResponseEntity.ok(Map.of(
                "id", driver.getId(),
                "firstName", driver.getFirstName(),
                "lastName", driver.getLastName() != null ? driver.getLastName() : "",
                "phone", driver.getPhone() != null ? driver.getPhone() : "",
                "licenseNumber", driver.getLicenseNumber(),
                "licenseExpiry", driver.getLicenseExpiry() != null ? driver.getLicenseExpiry().toString() : ""
        ));
    }

    // GET /operator/drivers - List all drivers
    @GetMapping
    public ResponseEntity<?> listDrivers(Authentication auth) {
        Operator operator = getOperator(auth);
        List<Driver> drivers = driverRepository.findByOperator(operator);

        return ResponseEntity.ok(drivers.stream().map(d -> Map.of(
                "id", d.getId(),
                "firstName", d.getFirstName(),
                "lastName", d.getLastName() != null ? d.getLastName() : "",
                "phone", d.getPhone() != null ? d.getPhone() : "",
                "licenseNumber", d.getLicenseNumber(),
                "licenseExpiry", d.getLicenseExpiry() != null ? d.getLicenseExpiry().toString() : ""
        )).toList());
    }

    // PUT /operator/drivers/{id} - Edit driver
    @PutMapping("/{driverId}")
    public ResponseEntity<?> updateDriver(
            @PathVariable UUID driverId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        Operator operator = getOperator(auth);

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        if (!driver.getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        if (body.get("firstName") != null) driver.setFirstName((String) body.get("firstName"));
        if (body.get("lastName") != null) driver.setLastName((String) body.get("lastName"));
        if (body.get("phone") != null) driver.setPhone((String) body.get("phone"));
        if (body.get("licenseNumber") != null) driver.setLicenseNumber((String) body.get("licenseNumber"));
        if (body.get("licenseExpiry") != null) driver.setLicenseExpiry(LocalDate.parse((String) body.get("licenseExpiry")));

        driver = driverRepository.save(driver);

        return ResponseEntity.ok(Map.of(
                "id", driver.getId(),
                "firstName", driver.getFirstName(),
                "lastName", driver.getLastName() != null ? driver.getLastName() : "",
                "phone", driver.getPhone() != null ? driver.getPhone() : "",
                "licenseNumber", driver.getLicenseNumber(),
                "licenseExpiry", driver.getLicenseExpiry() != null ? driver.getLicenseExpiry().toString() : ""
        ));
    }

    // DELETE /operator/drivers/{id} - Delete driver
    @DeleteMapping("/{driverId}")
    public ResponseEntity<?> deleteDriver(@PathVariable UUID driverId, Authentication auth) {
        Operator operator = getOperator(auth);

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        if (!driver.getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        // Delete all assignments for this driver first
        assignmentRepository.findByDriver(driver)
                .forEach(assignmentRepository::delete);

        driverRepository.delete(driver);
        return ResponseEntity.ok(Map.of("message", "Driver deleted successfully"));
    }

    // PATCH /operator/schedules/{id}/assign-driver
    @PatchMapping("/assign/{scheduleId}")
    public ResponseEntity<?> assignDriver(
            @PathVariable UUID scheduleId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        Operator operator = getOperator(auth);

        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (!schedule.getRoute().getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        UUID driverId = UUID.fromString((String) body.get("driverId"));
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        if (!driver.getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Driver does not belong to your operator");
        }

        // Unassign previous driver from bus if any
        assignmentRepository.findByBusAndAssignedToIsNull(schedule.getBus())
                .ifPresent(a -> {
                    a.setAssignedTo(java.time.Instant.now());
                    assignmentRepository.save(a);
                });

        // Assign new driver
        BusDriverAssignment assignment = BusDriverAssignment.builder()
                .bus(schedule.getBus())
                .driver(driver)
                .build();

        assignmentRepository.save(assignment);

        return ResponseEntity.ok(Map.of(
                "scheduleId", scheduleId,
                "busId", schedule.getBus().getId(),
                "driverId", driverId,
                "driverName", driver.getFirstName() + " " + (driver.getLastName() != null ? driver.getLastName() : ""),
                "message", "Driver assigned successfully"
        ));
    }

    private Operator getOperator(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        if (user.getOperator() == null) throw new RuntimeException("Not an operator");
        return user.getOperator();
    }
}
