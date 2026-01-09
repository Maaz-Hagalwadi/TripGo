package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.OperatorRegistrationRequest;
import com.tripgo.backend.service.impl.OperatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/operators")
@RequiredArgsConstructor
public class OperatorController {

    private final OperatorService operatorService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody OperatorRegistrationRequest request) throws Exception {
        return ResponseEntity.ok(operatorService.register(request));
    }
}

