package com.tripgo.backend.service.impl;

import com.tripgo.backend.dto.request.ApplyPromoRequest;
import com.tripgo.backend.dto.response.ApplyPromoResponse;
import com.tripgo.backend.model.entities.Discount;
import com.tripgo.backend.model.enums.DiscountType;
import com.tripgo.backend.repository.DiscountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class DiscountService {

    private final DiscountRepository discountRepository;

    public ApplyPromoResponse applyPromo(ApplyPromoRequest request) {
        Discount discount = discountRepository
                .findByCodeIgnoreCaseAndActiveTrue(request.getCode())
                .orElseThrow(() -> new RuntimeException("Invalid or expired promo code"));

        LocalDate today = LocalDate.now();
        if (discount.getValidFrom() != null && today.isBefore(discount.getValidFrom())) {
            throw new RuntimeException("Promo code is not yet valid");
        }
        if (discount.getValidTo() != null && today.isAfter(discount.getValidTo())) {
            throw new RuntimeException("Promo code has expired");
        }
        if (discount.getUsageLimit() != null && discount.getUsedCount() != null
                && discount.getUsedCount() >= discount.getUsageLimit()) {
            throw new RuntimeException("Promo code usage limit has been reached");
        }

        BigDecimal amount = request.getBookingAmount();
        if (discount.getMinOrderAmount() != null && amount.compareTo(discount.getMinOrderAmount()) < 0) {
            throw new RuntimeException("Minimum booking amount of ₹" + discount.getMinOrderAmount().toPlainString() + " required for this promo");
        }

        BigDecimal discountAmount;
        if (discount.getType() == DiscountType.PERCENT) {
            discountAmount = amount.multiply(discount.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (discount.getMaxDiscount() != null) {
                discountAmount = discountAmount.min(discount.getMaxDiscount());
            }
        } else {
            discountAmount = discount.getValue().min(amount);
        }

        BigDecimal finalAmount = amount.subtract(discountAmount).max(BigDecimal.ZERO);

        return ApplyPromoResponse.builder()
                .code(discount.getCode().toUpperCase())
                .originalAmount(amount)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .message("Promo applied! You save ₹" + discountAmount.setScale(0, RoundingMode.HALF_UP).toPlainString())
                .build();
    }
}
