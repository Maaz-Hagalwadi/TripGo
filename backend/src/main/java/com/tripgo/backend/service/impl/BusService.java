package com.tripgo.backend.service.impl;


import com.tripgo.backend.dto.request.CreateBusRequest;
import com.tripgo.backend.dto.response.AmenityDTO;
import com.tripgo.backend.dto.response.BusResponse;
import com.tripgo.backend.model.entities.AmenityMaster;
import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.AmenityMasterRepository;
import com.tripgo.backend.repository.BusRepository;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;


@Service
@RequiredArgsConstructor
public class BusService {

    private final BusRepository busRepository;
    private final AmenityMasterRepository amenityRepository;
    private final UserRepository userRepository;

    public BusResponse createBus(CreateBusRequest req, User user) {

        if (user.getOperator() == null) {
            throw new RuntimeException("User is not an operator");
        }

        List<AmenityMaster> amenities = amenityRepository.findAllById(req.amenityIds());

        Bus bus = busRepository.save(
                Bus.builder()
                        .operator(user.getOperator())
                        .busCode(req.busCode())
                        .vehicleNumber(req.vehicleNumber())
                        .model(req.model())
                        .busType(req.busType())
                        .totalSeats(req.totalSeats())
                        .amenities(amenities)
                        .build()
        );

        return toResponse(bus);
    }

    public List<BusResponse> list(User user) {
        List<Bus> buses = busRepository.findByOperator(user.getOperator());
        return buses.stream().map(this::toResponse).toList();
    }

    private BusResponse toResponse(Bus bus) {
        return new BusResponse(
                bus.getId(),
                bus.getBusCode(),
                bus.getVehicleNumber(),
                bus.getModel(),
                bus.getBusType(),
                bus.getTotalSeats(),
                bus.getAmenities().stream()
                        .map(a -> new AmenityDTO(
                                a.getId(),
                                a.getCode(),
                                a.getDescription()
                        ))
                        .toList()
        );
    }
}
