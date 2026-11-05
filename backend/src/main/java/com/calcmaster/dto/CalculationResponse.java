package com.calcmaster.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CalculationResponse(
        String expression,
        String result,
        String error,
        boolean success
) {}
