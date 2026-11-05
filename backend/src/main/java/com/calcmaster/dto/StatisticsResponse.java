package com.calcmaster.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StatisticsResponse(
        BigDecimal mean,
        BigDecimal median,
        List<BigDecimal> mode,
        BigDecimal variance,
        BigDecimal sampleVariance,
        BigDecimal stdDev,
        BigDecimal sampleStdDev,
        BigDecimal min,
        BigDecimal max,
        BigDecimal range,
        BigDecimal sum,
        int count
) {}
