package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.DiscountRequest;
import com.tripgo.backend.model.entities.Discount;
import com.tripgo.backend.repository.DiscountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/discounts")
@RequiredArgsConstructor
public class AdminDiscountController {

    private final DiscountRepository discountRepository;

    @GetMapping
    public ResponseEntity<?> listAll() {
        return ResponseEntity.ok(discountRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody DiscountRequest req) {
        Discount d = Discount.builder()
                .code(req.getCode() != null ? req.getCode().toUpperCase().trim() : null)
                .description(req.getDescription())
                .type(req.getType())
                .value(req.getValue())
                .maxDiscount(req.getMaxDiscount())
                .minOrderAmount(req.getMinOrderAmount())
                .usageLimit(req.getUsageLimit())
                .usedCount(0)
                .validFrom(req.getValidFrom())
                .validTo(req.getValidTo())
                .active(req.getActive() != null ? req.getActive() : true)
                .build();
        return ResponseEntity.ok(discountRepository.save(d));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody DiscountRequest req) {
        return discountRepository.findById(id).map(d -> {
            if (req.getDescription() != null) d.setDescription(req.getDescription());
            if (req.getType() != null) d.setType(req.getType());
            if (req.getValue() != null) d.setValue(req.getValue());
            d.setMaxDiscount(req.getMaxDiscount());
            d.setMinOrderAmount(req.getMinOrderAmount());
            d.setUsageLimit(req.getUsageLimit());
            d.setValidFrom(req.getValidFrom());
            d.setValidTo(req.getValidTo());
            if (req.getActive() != null) d.setActive(req.getActive());
            return ResponseEntity.ok(discountRepository.save(d));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable UUID id) {
        return discountRepository.findById(id).map(d -> {
            d.setActive(!Boolean.TRUE.equals(d.getActive()));
            return ResponseEntity.ok(discountRepository.save(d));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (!discountRepository.existsById(id)) return ResponseEntity.notFound().build();
        discountRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
