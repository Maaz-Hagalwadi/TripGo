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
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.exception.BadRequestException;
import org.springframework.transaction.annotation.Transactional;
import com.tripgo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
@Service
@RequiredArgsConstructor
public class BusService {

    private final BusRepository busRepository;
    private final AmenityMasterRepository amenityRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final RouteScheduleRepository routeScheduleRepository;

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

        emailService.notifyAdminsBusAdded(bus, user);

        // Real-time notification to all admins
        notificationService.sendToAdmins(
                "BUS_PENDING",
                "New Bus Pending Approval 🚌",
                "Operator " + user.getOperator().getName() + " added bus '" + bus.getName() + "' (" + bus.getBusCode() + "). Review required.",
                "/admin/dashboard?tab=buses&status=INACTIVE&busId=" + bus.getId()
        );

        return toResponse(bus);
    }

    public List<BusResponse> list(User user) {
        return busRepository.findByOperatorAndActiveWithAmenities(user.getOperator(), true)
                .stream().map(this::toResponse).toList();
    }

    public List<BusResponse> listPending(User user) {
        return busRepository.findByOperatorAndActiveWithAmenities(user.getOperator(), false)
                .stream().map(this::toResponse).toList();
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
                        .sorted(Comparator.comparing(AmenityMaster::getCode))
                        .map(a -> new AmenityDTO(
                                a.getId(),
                                a.getCode(),
                                a.getDescription()
                        ))
                        .toList(),
                bus.getCreatedAt(),
                bus.getUpdatedAt()
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

        // Type and seat count define the generated seat layout; changing them would orphan or miss seats
        if (!Objects.equals(bus.getBusType(), req.busType()) || !Objects.equals(bus.getTotalSeats(), req.totalSeats())) {
            throw new BadRequestException("The bus type and number of seats can't be changed once the seat layout exists. Add a new bus for a different layout.");
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

    @Transactional
    public void delete(UUID id, User user) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        if (!bus.getOperator().getId().equals(user.getOperator().getId())) {
            throw new RuntimeException("Access denied");
        }

        // Deactivating used to stand in for delete, which put the bus back in the admin approval queue.
        // Schedules keep their bus with ON DELETE SET NULL, so a bus in use must not be removed.
        if (routeScheduleRepository.existsByBus(bus)) {
            throw new BadRequestException("This bus is used by one or more schedules. Delete those schedules or move them to another bus first.");
        }
        busRepository.delete(bus); // seats, amenities and bus fares are removed by ON DELETE CASCADE
    }



}
