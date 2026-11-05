package com.calcmaster.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record FinancialEmiRequest(
        @NotNull(message = "Principal amount is required")
        @Positive(message = "Principal amount must be greater than zero")
        BigDecimal principal,

        @NotNull(message = "Annual interest rate is required")
        @PositiveOrZero(message = "Annual interest rate must be non-negative")
        BigDecimal annualRate,

        @Positive(message = "Tenure in months must be greater than zero")
        int tenureMonths,

        String currency
) {}
