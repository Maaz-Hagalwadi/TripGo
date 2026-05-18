package com.tripgo.backend.dto.request;

import com.tripgo.backend.model.enums.DiscountType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class DiscountRequest {
    private String code;
    private String description;
    private DiscountType type;
    private BigDecimal value;
    private BigDecimal maxDiscount;
    private BigDecimal minOrderAmount;
    private Integer usageLimit;
    private LocalDate validFrom;
    private LocalDate validTo;
    private Boolean active;
}
