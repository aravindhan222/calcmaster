package com.calcmaster.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ConvertRequest(
        @NotNull(message = "Value is required")
        BigDecimal value,

        @NotBlank(message = "From unit is required")
        String fromUnit,

        @NotBlank(message = "To unit is required")
        String toUnit,

        @NotBlank(message = "Category is required")
        String category
) {}
