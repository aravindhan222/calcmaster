package com.calcmaster.service;

import com.calcmaster.dto.ConvertRequest;
import com.calcmaster.dto.ConvertResponse;
import com.calcmaster.entity.CalculationHistory;
import com.calcmaster.repository.HistoryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class ConverterService {

    private static final MathContext MC = MathContext.DECIMAL128;
    private final HistoryRepository historyRepository;

    private static final Map<String, BigDecimal> LENGTH_FACTORS;
    private static final Map<String, BigDecimal> MASS_FACTORS;
    private static final Map<String, BigDecimal> DATA_FACTORS;

    static {
        // Length factors to meters (m)
        Map<String, BigDecimal> length = new HashMap<>();
        length.put("mm", new BigDecimal("0.001"));
        length.put("cm", new BigDecimal("0.01"));
        length.put("m", BigDecimal.ONE);
        length.put("km", new BigDecimal("1000"));
        length.put("in", new BigDecimal("0.0254"));
        length.put("ft", new BigDecimal("0.3048"));
        length.put("yd", new BigDecimal("0.9144"));
        length.put("mi", new BigDecimal("1609.344"));
        LENGTH_FACTORS = Collections.unmodifiableMap(length);

        // Mass factors to kilograms (kg)
        Map<String, BigDecimal> mass = new HashMap<>();
        mass.put("mg", new BigDecimal("0.000001"));
        mass.put("g", new BigDecimal("0.001"));
        mass.put("kg", BigDecimal.ONE);
        mass.put("t", new BigDecimal("1000"));
        mass.put("oz", new BigDecimal("0.028349523125"));
        mass.put("lb", new BigDecimal("0.45359237"));
        MASS_FACTORS = Collections.unmodifiableMap(mass);

        // Data factors to bytes (B, base 1024)
        Map<String, BigDecimal> data = new HashMap<>();
        data.put("b", BigDecimal.ONE);
        data.put("kb", new BigDecimal("1024"));
        data.put("mb", new BigDecimal("1048576"));
        data.put("gb", new BigDecimal("1073741824"));
        data.put("tb", new BigDecimal("1099511627776"));
        DATA_FACTORS = Collections.unmodifiableMap(data);
    }

    public ConverterService(HistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    public ConvertResponse convert(ConvertRequest request) {
        String category = request.category().trim().toUpperCase(Locale.ROOT);
        String fromUnit = request.fromUnit().trim();
        String toUnit = request.toUnit().trim();
        BigDecimal value = request.value();

        BigDecimal result;
        String formula;

        switch (category) {
            case "LENGTH" -> {
                result = convertLinear(value, fromUnit.toLowerCase(Locale.ROOT), toUnit.toLowerCase(Locale.ROOT), LENGTH_FACTORS);
                formula = String.format("%s * (factor_%s / factor_%s)", value.toPlainString(), fromUnit, toUnit);
            }
            case "MASS" -> {
                result = convertLinear(value, fromUnit.toLowerCase(Locale.ROOT), toUnit.toLowerCase(Locale.ROOT), MASS_FACTORS);
                formula = String.format("%s * (factor_%s / factor_%s)", value.toPlainString(), fromUnit, toUnit);
            }
            case "DATA" -> {
                result = convertLinear(value, fromUnit.toLowerCase(Locale.ROOT), toUnit.toLowerCase(Locale.ROOT), DATA_FACTORS);
                formula = String.format("%s * (factor_%s / factor_%s)", value.toPlainString(), fromUnit, toUnit);
            }
            case "TEMPERATURE" -> {
                ConversionResult tempResult = convertTemperature(value, fromUnit.toUpperCase(Locale.ROOT), toUnit.toUpperCase(Locale.ROOT));
                result = tempResult.result();
                formula = tempResult.formula();
            }
            default -> throw new IllegalArgumentException("Unsupported category: " + category + ". Supported: LENGTH, MASS, TEMPERATURE, DATA");
        }

        if (result.compareTo(BigDecimal.ZERO) == 0) {
            result = BigDecimal.ZERO;
        } else {
            result = result.setScale(8, RoundingMode.HALF_UP).stripTrailingZeros();
            if (result.scale() < 0) {
                result = result.setScale(0);
            }
        }

        String expression = String.format("%s %s to %s (%s)",
                value.stripTrailingZeros().toPlainString(), fromUnit, toUnit, category);
        String resultStr = String.format("%s %s", result.toPlainString(), toUnit);

        historyRepository.save(new CalculationHistory(expression, resultStr, "CONVERSION"));

        return new ConvertResponse(result, fromUnit, toUnit, category, formula);
    }

    private BigDecimal convertLinear(BigDecimal value, String from, String to, Map<String, BigDecimal> factors) {
        BigDecimal fromFactor = factors.get(from);
        if (fromFactor == null) {
            throw new IllegalArgumentException("Unknown unit: " + from + ". Supported units: " + factors.keySet());
        }
        BigDecimal toFactor = factors.get(to);
        if (toFactor == null) {
            throw new IllegalArgumentException("Unknown unit: " + to + ". Supported units: " + factors.keySet());
        }

        BigDecimal valueInBase = value.multiply(fromFactor, MC);
        return valueInBase.divide(toFactor, MC);
    }

    private record ConversionResult(BigDecimal result, String formula) {}

    private ConversionResult convertTemperature(BigDecimal value, String from, String to) {
        if (from.equals(to)) {
            return new ConversionResult(value, "Value remains unchanged");
        }

        BigDecimal nine = new BigDecimal("9");
        BigDecimal five = new BigDecimal("5");
        BigDecimal thirtyTwo = new BigDecimal("32");
        BigDecimal kelvinOffset = new BigDecimal("273.15");

        if ("C".equals(from) && "F".equals(to)) {
            // (°C * 9/5) + 32
            BigDecimal res = value.multiply(nine, MC).divide(five, MC).add(thirtyTwo, MC);
            return new ConversionResult(res, "(°C * 9/5) + 32");
        } else if ("F".equals(from) && "C".equals(to)) {
            // (°F - 32) * 5/9
            BigDecimal res = value.subtract(thirtyTwo, MC).multiply(five, MC).divide(nine, MC);
            return new ConversionResult(res, "(°F - 32) * 5/9");
        } else if ("C".equals(from) && "K".equals(to)) {
            // °C + 273.15
            BigDecimal res = value.add(kelvinOffset, MC);
            return new ConversionResult(res, "°C + 273.15");
        } else if ("K".equals(from) && "C".equals(to)) {
            // K - 273.15
            BigDecimal res = value.subtract(kelvinOffset, MC);
            return new ConversionResult(res, "K - 273.15");
        } else if ("F".equals(from) && "K".equals(to)) {
            // ((°F - 32) * 5/9) + 273.15
            BigDecimal c = value.subtract(thirtyTwo, MC).multiply(five, MC).divide(nine, MC);
            BigDecimal res = c.add(kelvinOffset, MC);
            return new ConversionResult(res, "((°F - 32) * 5/9) + 273.15");
        } else if ("K".equals(from) && "F".equals(to)) {
            // ((K - 273.15) * 9/5) + 32
            BigDecimal c = value.subtract(kelvinOffset, MC);
            BigDecimal res = c.multiply(nine, MC).divide(five, MC).add(thirtyTwo, MC);
            return new ConversionResult(res, "((K - 273.15) * 9/5) + 32");
        } else {
            throw new IllegalArgumentException("Unsupported temperature unit conversion from '" + from + "' to '" + to + "'. Supported: C, F, K");
        }
    }
}
