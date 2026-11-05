package com.calcmaster.service;

import com.calcmaster.dto.CalculationRequest;
import com.calcmaster.dto.CalculationResponse;
import com.calcmaster.engine.CalculationEngine;
import com.calcmaster.entity.CalculationHistory;
import com.calcmaster.repository.HistoryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class CalculationService {

    private final CalculationEngine calculationEngine;
    private final HistoryRepository historyRepository;

    public CalculationService(CalculationEngine calculationEngine, HistoryRepository historyRepository) {
        this.calculationEngine = calculationEngine;
        this.historyRepository = historyRepository;
    }

    public CalculationResponse calculate(CalculationRequest request) {
        try {
            BigDecimal result = calculationEngine.evaluate(request.expression());
            String resultStr = result.toPlainString();

            historyRepository.save(new CalculationHistory(request.expression(), resultStr, "STANDARD"));

            return new CalculationResponse(request.expression(), resultStr, null, true);
        } catch (Exception e) {
            return new CalculationResponse(request.expression(), null, e.getMessage(), false);
        }
    }
}
