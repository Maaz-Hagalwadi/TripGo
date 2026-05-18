package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.Discount;
import com.tripgo.backend.repository.DiscountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/discounts")
@RequiredArgsConstructor
public class PublicDiscountController {

    private final DiscountRepository discountRepository;

    @GetMapping("/active")
    public ResponseEntity<List<Map<String, Object>>> getActiveDiscounts() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> result = discountRepository.findAll().stream()
                .filter(d -> Boolean.TRUE.equals(d.getActive()))
                .filter(d -> d.getValidFrom() == null || !today.isBefore(d.getValidFrom()))
                .filter(d -> d.getValidTo() == null || !today.isAfter(d.getValidTo()))
                .map(this::toPublicView)
                .toList();
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toPublicView(Discount d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", d.getCode());
        m.put("description", d.getDescription());
        m.put("type", d.getType());
        m.put("value", d.getValue());
        m.put("maxDiscount", d.getMaxDiscount());
        m.put("minOrderAmount", d.getMinOrderAmount());
        m.put("validTo", d.getValidTo());
        return m;
    }
}
