package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.entities.UserSavedRoute;
import com.tripgo.backend.repository.UserSavedRouteRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/saved-routes")
@RequiredArgsConstructor
public class SavedRoutesController {

    private final UserSavedRouteRepository savedRouteRepository;

    @GetMapping
    public List<Map<String, Object>> getSavedRoutes(Authentication auth) {
        User user = getUser(auth);
        return savedRouteRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(r -> Map.<String, Object>of(
                        "id",        r.getId(),
                        "fromCity",  r.getFromCity(),
                        "toCity",    r.getToCity(),
                        "createdAt", r.getCreatedAt()
                ))
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> saveRoute(@RequestBody Map<String, String> body, Authentication auth) {
        User user = getUser(auth);
        String fromCity = body.get("fromCity");
        String toCity   = body.get("toCity");

        if (fromCity == null || toCity == null || fromCity.isBlank() || toCity.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "fromCity and toCity are required"));
        }

        if (savedRouteRepository.existsByUserAndFromCityAndToCity(user, fromCity, toCity)) {
            return savedRouteRepository.findByUserAndFromCityAndToCity(user, fromCity, toCity)
                    .map(r -> ResponseEntity.ok(Map.<String, Object>of(
                            "id",        r.getId(),
                            "fromCity",  r.getFromCity(),
                            "toCity",    r.getToCity(),
                            "createdAt", r.getCreatedAt()
                    )))
                    .orElse(ResponseEntity.ok().build());
        }

        UserSavedRoute saved = savedRouteRepository.save(
                UserSavedRoute.builder()
                        .user(user)
                        .fromCity(fromCity)
                        .toCity(toCity)
                        .build()
        );

        return ResponseEntity.ok(Map.of(
                "id",        saved.getId(),
                "fromCity",  saved.getFromCity(),
                "toCity",    saved.getToCity(),
                "createdAt", saved.getCreatedAt()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> unsaveRoute(@PathVariable UUID id, Authentication auth) {
        User user = getUser(auth);
        return savedRouteRepository.findById(id)
                .filter(r -> r.getUser().getId().equals(user.getId()))
                .map(r -> {
                    savedRouteRepository.delete(r);
                    return ResponseEntity.ok(Map.of("deleted", true));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private User getUser(Authentication auth) {
        return ((CustomUserDetails) auth.getPrincipal()).getUser();
    }
}
