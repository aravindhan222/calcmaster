package com.calcmaster.service;

import com.calcmaster.dto.CalculationResponse;
import com.calcmaster.dto.ScientificRequest;
import com.calcmaster.engine.CalculationEngine;
import com.calcmaster.entity.CalculationHistory;
import com.calcmaster.repository.HistoryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class ScientificService {

    private final CalculationEngine calculationEngine;
    private final HistoryRepository historyRepository;

    public ScientificService(CalculationEngine calculationEngine, HistoryRepository historyRepository) {
        this.calculationEngine = calculationEngine;
        this.historyRepository = historyRepository;
    }

    public CalculationResponse calculate(ScientificRequest request) {
        try {
            BigDecimal result = calculationEngine.evaluateScientific(request.expression(), request.degreesMode());
            String resultStr = result.toPlainString();

            historyRepository.save(new CalculationHistory(request.expression(), resultStr, "SCIENTIFIC"));

            return new CalculationResponse(request.expression(), resultStr, null, true);
        } catch (Exception e) {
            return new CalculationResponse(request.expression(), null, e.getMessage(), false);
        }
    }
}
