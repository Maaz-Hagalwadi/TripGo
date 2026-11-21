package com.tripgo.backend.service.impl;

import com.tripgo.backend.config.AppTime;

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
    private final com.tripgo.backend.repository.BookingRepository bookingRepository;

    /** Counts one use of a promo code (called once its booking is confirmed). */
    public void recordUse(String code) {
        if (code != null && !code.isBlank()) discountRepository.incrementUsage(code.trim());
    }

    public ApplyPromoResponse applyPromo(ApplyPromoRequest request) {
        return applyPromo(request, null);
    }

    /**
     * Validates a code for this traveller and works out the discount. {@code user} is the signed-in
     * account (null for guests, who are identified by the email / phone on the request).
     */
    public ApplyPromoResponse applyPromo(ApplyPromoRequest request, com.tripgo.backend.model.entities.User user) {
        Discount discount = discountRepository
                .findByCodeIgnoreCaseAndActiveTrue(request.getCode())
                .orElseThrow(() -> new com.tripgo.backend.exception.BadRequestException("Invalid or expired promo code"));

        LocalDate today = LocalDate.now(AppTime.ZONE); // promo dates are IST calendar days
        if (discount.getValidFrom() != null && today.isBefore(discount.getValidFrom())) {
            throw new com.tripgo.backend.exception.BadRequestException("Promo code is not yet valid");
        }
        if (discount.getValidTo() != null && today.isAfter(discount.getValidTo())) {
            throw new com.tripgo.backend.exception.BadRequestException("Promo code has expired");
        }
        if (discount.getUsageLimit() != null && discount.getUsedCount() != null
                && discount.getUsedCount() >= discount.getUsageLimit()) {
            throw new com.tripgo.backend.exception.BadRequestException("Promo code usage limit has been reached");
        }

        boolean perCustomerRule = Boolean.TRUE.equals(discount.getFirstBookingOnly()) || discount.getPerCustomerLimit() != null;
        if (perCustomerRule) {
            String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
            if (email.isEmpty() && user != null && user.getEmail() != null) email = user.getEmail().trim().toLowerCase();
            String phone = request.getPhone() != null ? request.getPhone().replaceAll("[^0-9]", "") : "";
            if (phone.length() > 10) phone = phone.substring(phone.length() - 10);
            if (user == null && email.isEmpty() && phone.isEmpty()) {
                throw new com.tripgo.backend.exception.BadRequestException("Add your email and phone number first — this code is limited per traveller");
            }
            String code = discount.getCode().toUpperCase();
            java.util.UUID userId = user != null ? user.getId() : new java.util.UUID(0, 0); // never null: keeps the query typed
            if (Boolean.TRUE.equals(discount.getFirstBookingOnly())
                    && bookingRepository.countConfirmedForCustomer(userId, email, phone, "") > 0) {
                throw new com.tripgo.backend.exception.BadRequestException(code + " is only for your first TripGo booking");
            }
            if (discount.getPerCustomerLimit() != null
                    && bookingRepository.countConfirmedForCustomer(userId, email, phone, code) >= discount.getPerCustomerLimit()) {
                throw new com.tripgo.backend.exception.BadRequestException("You've already used " + code
                        + (discount.getPerCustomerLimit() == 1 ? "" : " " + discount.getPerCustomerLimit() + " times"));
            }
        }

        BigDecimal amount = request.getBookingAmount();
        if (discount.getMinOrderAmount() != null && amount.compareTo(discount.getMinOrderAmount()) < 0) {
            throw new com.tripgo.backend.exception.BadRequestException("Minimum booking amount of ₹" + discount.getMinOrderAmount().toPlainString() + " required for this promo");
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
