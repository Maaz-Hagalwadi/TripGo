package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.PassengerProfileRequest;
import com.tripgo.backend.model.entities.Passenger;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.PassengerRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/user/passengers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class PassengerProfileController {

    private final PassengerRepository passengerRepository;

    private User currentUser(Authentication auth) {
        return ((CustomUserDetails) auth.getPrincipal()).getUser();
    }

    private Map<String, Object> toDto(Passenger p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("firstName", p.getFirstName());
        m.put("lastName", p.getLastName() != null ? p.getLastName() : "");
        m.put("age", p.getAge());
        m.put("gender", p.getGender());
        m.put("phone", p.getPhone());
        m.put("createdAt", p.getCreatedAt());
        return m;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication auth) {
        return ResponseEntity.ok(
            passengerRepository.findByUserOrderByCreatedAtDesc(currentUser(auth))
                .stream().map(this::toDto).toList()
        );
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PassengerProfileRequest req, Authentication auth) {
        Passenger p = new Passenger();
        p.setUser(currentUser(auth));
        p.setFirstName(req.getFirstName());
        p.setLastName(req.getLastName());
        p.setAge(req.getAge());
        p.setGender(req.getGender());
        p.setPhone(req.getPhone());
        return ResponseEntity.ok(toDto(passengerRepository.save(p)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id,
                                    @RequestBody PassengerProfileRequest req,
                                    Authentication auth) {
        Passenger p = passengerRepository.findByIdAndUser(id, currentUser(auth))
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        p.setFirstName(req.getFirstName());
        p.setLastName(req.getLastName());
        p.setAge(req.getAge());
        p.setGender(req.getGender());
        p.setPhone(req.getPhone());
        return ResponseEntity.ok(toDto(passengerRepository.save(p)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        Passenger p = passengerRepository.findByIdAndUser(id, currentUser(auth))
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        passengerRepository.delete(p);
        return ResponseEntity.noContent().build();
    }
}
