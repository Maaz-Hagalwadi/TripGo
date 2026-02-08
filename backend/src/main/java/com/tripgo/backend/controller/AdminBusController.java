package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.repository.BusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/buses")
@RequiredArgsConstructor
public class AdminBusController {

    private final BusRepository busRepository;

    @PostMapping("/{id}/approve")
    public ResponseEntity<String> approveBus(@PathVariable UUID id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        bus.setActive(true);
        busRepository.save(bus);

        return ResponseEntity.ok("Bus approved and activated");
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<String> rejectBus(@PathVariable UUID id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        bus.setActive(false);
        busRepository.save(bus);

        return ResponseEntity.ok("Bus rejected");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteBusPermanently(@PathVariable UUID id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        busRepository.delete(bus);

        return ResponseEntity.ok("Bus permanently deleted from database");
    }
}
