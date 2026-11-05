package com.calcmaster.service;

import com.calcmaster.dto.StatisticsRequest;
import com.calcmaster.dto.StatisticsResponse;
import com.calcmaster.entity.CalculationHistory;
import com.calcmaster.repository.HistoryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.*;

@Service
public class StatisticsService {

    private static final MathContext MC = MathContext.DECIMAL128;
    private final HistoryRepository historyRepository;

    public StatisticsService(HistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    public StatisticsResponse calculate(StatisticsRequest request) {
        List<BigDecimal> data = request.data();
        if (data == null || data.isEmpty()) {
            throw new IllegalArgumentException("Data list cannot be null or empty");
        }

        int count = data.size();
        List<BigDecimal> sorted = new ArrayList<>(data);
        Collections.sort(sorted);

        // Sum
        BigDecimal sum = BigDecimal.ZERO;
        for (BigDecimal val : sorted) {
            sum = sum.add(val, MC);
        }

        // Mean
        BigDecimal mean = sum.divide(BigDecimal.valueOf(count), MC);

        // Median
        BigDecimal median;
        if (count % 2 == 1) {
            median = sorted.get(count / 2);
        } else {
            BigDecimal mid1 = sorted.get((count / 2) - 1);
            BigDecimal mid2 = sorted.get(count / 2);
            median = mid1.add(mid2, MC).divide(BigDecimal.valueOf(2), MC);
        }

        // Mode
        Map<BigDecimal, Long> frequencyMap = new LinkedHashMap<>();
        for (BigDecimal val : sorted) {
            frequencyMap.put(val, frequencyMap.getOrDefault(val, 0L) + 1L);
        }
        long maxFreq = 0;
        for (long freq : frequencyMap.values()) {
            if (freq > maxFreq) {
                maxFreq = freq;
            }
        }
        List<BigDecimal> modeList = new ArrayList<>();
        for (Map.Entry<BigDecimal, Long> entry : frequencyMap.entrySet()) {
            if (entry.getValue() == maxFreq) {
                modeList.add(entry.getKey());
            }
        }

        // Min, Max, Range
        BigDecimal min = sorted.get(0);
        BigDecimal max = sorted.get(count - 1);
        BigDecimal range = max.subtract(min, MC);

        // Variance and Sample Variance
        BigDecimal sumSqDiff = BigDecimal.ZERO;
        for (BigDecimal val : sorted) {
            BigDecimal diff = val.subtract(mean, MC);
            sumSqDiff = sumSqDiff.add(diff.multiply(diff, MC), MC);
        }

        BigDecimal variance = sumSqDiff.divide(BigDecimal.valueOf(count), MC);
        BigDecimal sampleVariance = count > 1
                ? sumSqDiff.divide(BigDecimal.valueOf(count - 1), MC)
                : BigDecimal.ZERO;

        // Standard Deviation and Sample Standard Deviation
        BigDecimal stdDev = variance.sqrt(MC);
        BigDecimal sampleStdDev = sampleVariance.sqrt(MC);

        // Format BigDecimals to 8 decimal places for clean representation
        mean = cleanScale(mean);
        median = cleanScale(median);
        variance = cleanScale(variance);
        sampleVariance = cleanScale(sampleVariance);
        stdDev = cleanScale(stdDev);
        sampleStdDev = cleanScale(sampleStdDev);
        min = cleanScale(min);
        max = cleanScale(max);
        range = cleanScale(range);
        sum = cleanScale(sum);

        String sampleStr = count <= 5 ? data.toString() : data.subList(0, 5) + "... (" + count + " items)";
        String expression = "Statistics: " + sampleStr;
        String result = String.format("Mean=%s, Median=%s, StdDev=%s, Range=%s",
                mean.toPlainString(), median.toPlainString(), sampleStdDev.toPlainString(), range.toPlainString());

        historyRepository.save(new CalculationHistory(expression, result, "STATISTICS"));

        return new StatisticsResponse(
                mean, median, modeList, variance, sampleVariance,
                stdDev, sampleStdDev, min, max, range, sum, count
        );
    }

    private BigDecimal cleanScale(BigDecimal val) {
        if (val.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal cleaned = val.setScale(8, RoundingMode.HALF_UP).stripTrailingZeros();
        if (cleaned.scale() < 0) {
            cleaned = cleaned.setScale(0);
        }
        return cleaned;
    }
}
