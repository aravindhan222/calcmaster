package com.calcmaster.dto;

import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.util.List;

public record StatisticsRequest(
        @NotEmpty(message = "Data list must not be empty")
        List<BigDecimal> data
) {}
