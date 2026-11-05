package com.calcmaster.dto;

import jakarta.validation.constraints.NotBlank;

public record CalculationRequest(
        @NotBlank(message = "Expression must not be blank")
        String expression,
        boolean degreesMode
) {}
