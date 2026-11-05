package com.calcmaster.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record CompoundInterestRequest(
        @NotNull(message = "Principal amount is required")
        @Positive(message = "Principal amount must be greater than zero")
        BigDecimal principal,

        @NotNull(message = "Annual interest rate is required")
        @PositiveOrZero(message = "Annual interest rate must be non-negative")
        BigDecimal annualRate,

        @Positive(message = "Years must be greater than zero")
        int years,

        @Positive(message = "Compounds per year must be greater than zero")
        int compoundsPerYear,

        String currency
) {}
