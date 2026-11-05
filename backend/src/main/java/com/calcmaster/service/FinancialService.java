package com.calcmaster.service;

import com.calcmaster.dto.*;
import com.calcmaster.entity.CalculationHistory;
import com.calcmaster.repository.HistoryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class FinancialService {

    private static final MathContext MC = MathContext.DECIMAL128;
    private final HistoryRepository historyRepository;

    public FinancialService(HistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    public FinancialEmiResponse calculateEmi(FinancialEmiRequest request) {
        BigDecimal principal = request.principal();
        BigDecimal annualRate = request.annualRate();
        int tenureMonths = request.tenureMonths();

        BigDecimal emi;
        BigDecimal monthlyRate;

        if (annualRate.compareTo(BigDecimal.ZERO) == 0) {
            monthlyRate = BigDecimal.ZERO;
            emi = principal.divide(BigDecimal.valueOf(tenureMonths), 2, RoundingMode.HALF_UP);
        } else {
            // monthly interest rate r = (annualRate / 100) / 12
            monthlyRate = annualRate.divide(new BigDecimal("1200"), MC);
            BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate, MC);
            BigDecimal onePlusRPowN = onePlusR.pow(tenureMonths, MC);

            BigDecimal numerator = principal.multiply(monthlyRate, MC).multiply(onePlusRPowN, MC);
            BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE, MC);
            BigDecimal rawEmi = numerator.divide(denominator, MC);
            emi = rawEmi.setScale(2, RoundingMode.HALF_UP);
        }

        List<AmortizationRow> schedule = new ArrayList<>();
        BigDecimal balance = principal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalInterest = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPayment = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (int month = 1; month <= tenureMonths; month++) {
            BigDecimal interestPayment = balance.multiply(monthlyRate, MC).setScale(2, RoundingMode.HALF_UP);
            BigDecimal principalPayment;
            BigDecimal monthEmi = emi;

            if (month == tenureMonths) {
                // Adjust last month to exact zero balance
                principalPayment = balance;
                monthEmi = principalPayment.add(interestPayment);
                balance = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            } else {
                principalPayment = monthEmi.subtract(interestPayment);
                balance = balance.subtract(principalPayment).setScale(2, RoundingMode.HALF_UP);
                if (balance.compareTo(BigDecimal.ZERO) < 0) {
                    balance = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                }
            }

            totalInterest = totalInterest.add(interestPayment);
            totalPayment = totalPayment.add(monthEmi);

            schedule.add(new AmortizationRow(month, monthEmi, principalPayment, interestPayment, balance));
        }

        String expression = String.format("EMI: Principal=%s, Rate=%s%%, Tenure=%d months",
                principal.stripTrailingZeros().toPlainString(),
                annualRate.stripTrailingZeros().toPlainString(),
                tenureMonths);
        String result = String.format("EMI=%s, Total Payment=%s, Total Interest=%s",
                emi.toPlainString(), totalPayment.toPlainString(), totalInterest.toPlainString());

        historyRepository.save(new CalculationHistory(expression, result, "FINANCIAL"));

        return new FinancialEmiResponse(emi, totalPayment, totalInterest, schedule);
    }

    public CompoundInterestResponse calculateCompoundInterest(CompoundInterestRequest request) {
        BigDecimal principal = request.principal();
        BigDecimal annualRate = request.annualRate();
        int years = request.years();
        int compoundsPerYear = request.compoundsPerYear();

        BigDecimal rOverN = annualRate.divide(new BigDecimal("100"), MC)
                .divide(BigDecimal.valueOf(compoundsPerYear), MC);
        BigDecimal base = BigDecimal.ONE.add(rOverN, MC);
        int totalPeriods = compoundsPerYear * years;
        BigDecimal compoundFactor = base.pow(totalPeriods, MC);

        BigDecimal amount = principal.multiply(compoundFactor, MC).setScale(2, RoundingMode.HALF_UP);
        BigDecimal interest = amount.subtract(principal).setScale(2, RoundingMode.HALF_UP);

        String expression = String.format("Compound Interest: Principal=%s, Rate=%s%%, Years=%d, Compounds/Yr=%d",
                principal.stripTrailingZeros().toPlainString(),
                annualRate.stripTrailingZeros().toPlainString(),
                years, compoundsPerYear);
        String result = String.format("Amount=%s, Interest=%s",
                amount.toPlainString(), interest.toPlainString());

        historyRepository.save(new CalculationHistory(expression, result, "FINANCIAL"));

        return new CompoundInterestResponse(amount, interest);
    }

    public SimpleInterestResponse calculateSimpleInterest(SimpleInterestRequest request) {
        BigDecimal principal = request.principal();
        BigDecimal annualRate = request.annualRate();
        int years = request.years();

        BigDecimal interest = principal.multiply(annualRate, MC)
                .multiply(BigDecimal.valueOf(years), MC)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = principal.add(interest).setScale(2, RoundingMode.HALF_UP);

        String expression = String.format("Simple Interest: Principal=%s, Rate=%s%%, Years=%d",
                principal.stripTrailingZeros().toPlainString(),
                annualRate.stripTrailingZeros().toPlainString(),
                years);
        String result = String.format("Interest=%s, Total=%s",
                interest.toPlainString(), totalAmount.toPlainString());

        historyRepository.save(new CalculationHistory(expression, result, "FINANCIAL"));

        return new SimpleInterestResponse(interest, totalAmount);
    }
}
