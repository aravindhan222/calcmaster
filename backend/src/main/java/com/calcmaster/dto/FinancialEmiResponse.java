package com.calcmaster.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FinancialEmiResponse(
        BigDecimal emi,
        BigDecimal totalPayment,
        BigDecimal totalInterest,
        List<AmortizationRow> schedule
) {}
