package com.tripgo.backend.service.impl;


import com.tripgo.backend.dto.request.CreateBusRequest;
import com.tripgo.backend.dto.request.UpdateBusRequest;
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

import java.util.Comparator;
import java.util.List;
import java.util.UUID;


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
                        .name(req.name())
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
        List<Bus> buses = busRepository.findByOperatorAndActiveTrue(user.getOperator());
        return buses.stream().map(this::toResponse).toList();
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
                bus.getAmenities().stream()
                        .sorted(Comparator.comparing(AmenityMaster::getCode))
                        .map(a -> new AmenityDTO(
                                a.getId(),
                                a.getCode(),
                                a.getDescription()
                        ))
                        .toList()
        );
    }


    public BusResponse get(UUID id, User user) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        if (!bus.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        return toResponse(bus);
    }

    public BusResponse update(UUID id, UpdateBusRequest req, User user) {

        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        if (!bus.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        List<AmenityMaster> amenities = amenityRepository.findAllById(req.amenityIds());

        bus.setName(req.name());
        bus.setBusCode(req.busCode());
        bus.setVehicleNumber(req.vehicleNumber());
        bus.setModel(req.model());
        bus.setBusType(req.busType());
        bus.setTotalSeats(req.totalSeats());
        bus.setAmenities(amenities);

        busRepository.save(bus);

        return toResponse(bus);
    }

    public void delete(UUID id, User user) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        if (!bus.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        bus.setActive(false);
        busRepository.save(bus);
    }



}
