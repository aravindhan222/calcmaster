package com.calcmaster.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AmortizationRow(
        int month,
        BigDecimal emi,
        BigDecimal principal,
        BigDecimal interest,
        BigDecimal balance
) {}
