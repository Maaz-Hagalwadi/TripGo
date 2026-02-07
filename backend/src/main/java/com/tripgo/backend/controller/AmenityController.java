package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.AmenityDTO;
import com.tripgo.backend.repository.AmenityMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/amenities")
@RequiredArgsConstructor
public class AmenityController {

    private final AmenityMasterRepository amenityRepository;

    @GetMapping
    public List<AmenityDTO> getAll() {
        return amenityRepository.findAll().stream()
                .map(a -> new AmenityDTO(a.getId(), a.getCode(), a.getDescription()))
                .toList();
    }
}
