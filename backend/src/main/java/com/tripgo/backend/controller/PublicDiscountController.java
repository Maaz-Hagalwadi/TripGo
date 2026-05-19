package com.tripgo.backend.controller;

import com.tripgo.backend.repository.DiscountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/discounts")
@RequiredArgsConstructor
public class PublicDiscountController {

    private final DiscountRepository discountRepository;

    @GetMapping("/active")
    public ResponseEntity<List<Map<String, Object>>> getActiveDiscounts() {
        try {
            List<Object[]> rows = discountRepository.findActiveDiscountsRaw(LocalDate.now());
            List<Map<String, Object>> result = rows.stream()
                    .map(row -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("code",           row[0]);
                        m.put("description",    row[1]);
                        m.put("type",           row[2]);
                        m.put("value",          row[3]);
                        m.put("maxDiscount",    row[4]);
                        m.put("minOrderAmount", row[5]);
                        m.put("validTo",        row[6]);
                        return m;
                    })
                    .toList();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to load active discounts", e);
            return ResponseEntity.ok(List.of());
        }
    }
}
