package com.calcmaster.controller;

import com.calcmaster.dto.StatisticsRequest;
import com.calcmaster.dto.StatisticsResponse;
import com.calcmaster.service.StatisticsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @PostMapping("/statistics")
    public ResponseEntity<StatisticsResponse> calculateStatistics(@Valid @RequestBody StatisticsRequest request) {
        StatisticsResponse response = statisticsService.calculate(request);
        return ResponseEntity.ok(response);
    }
}
