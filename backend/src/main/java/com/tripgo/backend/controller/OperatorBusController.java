package com.tripgo.backend.controller;
import com.tripgo.backend.dto.request.CreateBusRequest;
import com.tripgo.backend.dto.request.OperatorRegistrationRequest;
import com.tripgo.backend.dto.response.BusResponse;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.RoleType;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.BusService;
import com.tripgo.backend.service.impl.OperatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/operator/buses")
@RequiredArgsConstructor
public class OperatorBusController {

    private final BusService busService;

    @PostMapping
    public BusResponse createBus(@RequestBody CreateBusRequest req, Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        if (!user.hasRole(RoleType.ROLE_OPERATOR)) {
            throw new RuntimeException("Only operators can create buses");
        }

        return busService.createBus(req, user);
    }

    @GetMapping
    public List<BusResponse> listBuses(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return busService.list(user);
    }
}

