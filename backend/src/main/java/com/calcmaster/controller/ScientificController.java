package com.calcmaster.controller;

import com.calcmaster.dto.CalculationResponse;
import com.calcmaster.dto.ScientificRequest;
import com.calcmaster.service.ScientificService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ScientificController {

    private final ScientificService scientificService;

    public ScientificController(ScientificService scientificService) {
        this.scientificService = scientificService;
    }

    @PostMapping("/scientific")
    public ResponseEntity<CalculationResponse> calculateScientific(@Valid @RequestBody ScientificRequest request) {
        CalculationResponse response = scientificService.calculate(request);
        return ResponseEntity.ok(response);
    }
}
