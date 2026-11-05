package com.calcmaster.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CompoundInterestResponse(
        BigDecimal amount,
        BigDecimal interest
) {}
