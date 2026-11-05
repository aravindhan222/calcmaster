package com.calcmaster.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record HistoryResponse(
        Long id,
        String expression,
        String result,
        String type,
        String timestamp
) {}
