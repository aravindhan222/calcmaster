package com.calcmaster.engine;

import com.calcmaster.parser.ExpressionParser;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Service engine providing unified expression evaluation and mathematical calculations.
 */
@Service
public class CalculationEngine {

    private final ExpressionParser expressionParser;

    public CalculationEngine(ExpressionParser expressionParser) {
        this.expressionParser = expressionParser;
    }

    public BigDecimal evaluate(String expression) {
        return expressionParser.parseAndEvaluate(expression, false);
    }

    public BigDecimal evaluateScientific(String expression, boolean degreesMode) {
        return expressionParser.parseAndEvaluate(expression, degreesMode);
    }

    public BigDecimal factorial(int n) {
        return ExpressionParser.factorial(n);
    }
}
