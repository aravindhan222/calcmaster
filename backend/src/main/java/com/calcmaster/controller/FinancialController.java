package com.calcmaster.controller;

import com.calcmaster.dto.*;
import com.calcmaster.service.FinancialService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/financial")
public class FinancialController {

    private final FinancialService financialService;

    public FinancialController(FinancialService financialService) {
        this.financialService = financialService;
    }

    @PostMapping("/emi")
    public ResponseEntity<FinancialEmiResponse> calculateEmi(@Valid @RequestBody FinancialEmiRequest request) {
        FinancialEmiResponse response = financialService.calculateEmi(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/compound-interest")
    public ResponseEntity<CompoundInterestResponse> calculateCompoundInterest(
            @Valid @RequestBody CompoundInterestRequest request) {
        CompoundInterestResponse response = financialService.calculateCompoundInterest(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/simple-interest")
    public ResponseEntity<SimpleInterestResponse> calculateSimpleInterest(
            @Valid @RequestBody SimpleInterestRequest request) {
        SimpleInterestResponse response = financialService.calculateSimpleInterest(request);
        return ResponseEntity.ok(response);
    }
}
