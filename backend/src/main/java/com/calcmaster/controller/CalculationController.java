package com.calcmaster.controller;

import com.calcmaster.dto.CalculationRequest;
import com.calcmaster.dto.CalculationResponse;
import com.calcmaster.service.CalculationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CalculationController {

    private final CalculationService calculationService;

    public CalculationController(CalculationService calculationService) {
        this.calculationService = calculationService;
    }

    @PostMapping("/calculate")
    public ResponseEntity<CalculationResponse> calculate(@Valid @RequestBody CalculationRequest request) {
        CalculationResponse response = calculationService.calculate(request);
        return ResponseEntity.ok(response);
    }
}
