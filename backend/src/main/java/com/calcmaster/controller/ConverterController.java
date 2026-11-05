package com.calcmaster.controller;

import com.calcmaster.dto.ConvertRequest;
import com.calcmaster.dto.ConvertResponse;
import com.calcmaster.service.ConverterService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ConverterController {

    private final ConverterService converterService;

    public ConverterController(ConverterService converterService) {
        this.converterService = converterService;
    }

    @PostMapping("/convert")
    public ResponseEntity<ConvertResponse> convert(@Valid @RequestBody ConvertRequest request) {
        ConvertResponse response = converterService.convert(request);
        return ResponseEntity.ok(response);
    }
}
