package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.AmenityDTO;
import com.tripgo.backend.dto.response.BusResponse;
import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.repository.BusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/buses")
@RequiredArgsConstructor
public class AdminBusController {

    private final BusRepository busRepository;

    @GetMapping
    public List<BusResponse> listBuses(@RequestParam(required = false) Boolean active) {
        List<Bus> buses = busRepository.findAll();
        if (active != null) {
            buses = buses.stream().filter(b -> b.isActive() == active).toList();
        }
        return buses.stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public BusResponse getBus(@PathVariable UUID id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));
        return toResponse(bus);
    }

    @PostMapping("/{id}/approve")
    public BusResponse approveBus(@PathVariable UUID id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        bus.setActive(true);
        busRepository.save(bus);

        return toResponse(bus);
    }

    @PostMapping("/{id}/reject")
    public BusResponse rejectBus(@PathVariable UUID id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        bus.setActive(false);
        busRepository.save(bus);

        return toResponse(bus);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteBusPermanently(@PathVariable UUID id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        busRepository.delete(bus);

        return ResponseEntity.ok("Bus permanently deleted from database");
    }

    private BusResponse toResponse(Bus bus) {
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
                        .sorted(Comparator.comparing(a -> a.getCode()))
                        .map(a -> new AmenityDTO(a.getId(), a.getCode(), a.getDescription()))
                        .toList()
        );
    }
}
