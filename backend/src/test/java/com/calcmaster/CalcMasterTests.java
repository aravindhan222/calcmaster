package com.calcmaster;

import com.calcmaster.dto.*;
import com.calcmaster.exception.DivisionByZeroException;
import com.calcmaster.exception.DomainErrorException;
import com.calcmaster.exception.InvalidExpressionException;
import com.calcmaster.parser.ExpressionParser;
import com.calcmaster.service.ConverterService;
import com.calcmaster.service.ExportService;
import com.calcmaster.service.FinancialService;
import com.calcmaster.service.StatisticsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class CalcMasterTests {

    @Autowired
    private ExpressionParser expressionParser;

    @Autowired
    private FinancialService financialService;

    @Autowired
    private StatisticsService statisticsService;

    @Autowired
    private ConverterService converterService;

    @Autowired
    private ExportService exportService;

    @Nested
    @DisplayName("ExpressionParser Tests")
    class ExpressionParserTests {

        @Test
        @DisplayName("Basic arithmetic operations")
        void testBasicArithmetic() {
            assertEquals(new BigDecimal("5"), expressionParser.parseAndEvaluate("2 + 3"));
            assertEquals(new BigDecimal("6"), expressionParser.parseAndEvaluate("10 - 4"));
            assertEquals(new BigDecimal("21"), expressionParser.parseAndEvaluate("3 * 7"));
            assertEquals(new BigDecimal("5"), expressionParser.parseAndEvaluate("20 / 4"));
            assertEquals(new BigDecimal("1"), expressionParser.parseAndEvaluate("7 % 3"));
        }

        @Test
        @DisplayName("Decimal numbers arithmetic")
        void testDecimals() {
            BigDecimal res1 = expressionParser.parseAndEvaluate("2.5 * 4.2");
            assertEquals(new BigDecimal("10.5"), res1);

            BigDecimal res2 = expressionParser.parseAndEvaluate("10.5 + 0.25");
            assertEquals(new BigDecimal("10.75"), res2);
        }

        @Test
        @DisplayName("Parentheses and precedence")
        void testParenthesesAndPrecedence() {
            // Precedence: * before +
            assertEquals(new BigDecimal("14"), expressionParser.parseAndEvaluate("2 + 3 * 4"));
            assertEquals(new BigDecimal("4"), expressionParser.parseAndEvaluate("10 - 2 * 3"));

            // Parentheses override precedence
            assertEquals(new BigDecimal("20"), expressionParser.parseAndEvaluate("(2 + 3) * 4"));
            assertEquals(new BigDecimal("22"), expressionParser.parseAndEvaluate("2 * (3 + (4 * 2))"));

            // Exponentiation precedence over addition
            assertEquals(new BigDecimal("11"), expressionParser.parseAndEvaluate("2 + 3 ^ 2"));

            // Exponentiation right-associativity: 2 ^ 3 ^ 2 = 2 ^ 9 = 512
            assertEquals(new BigDecimal("512"), expressionParser.parseAndEvaluate("2 ^ 3 ^ 2"));
        }

        @Test
        @DisplayName("Unary minus evaluation")
        void testUnaryMinus() {
            assertEquals(new BigDecimal("-2"), expressionParser.parseAndEvaluate("-5 + 3"));
            assertEquals(new BigDecimal("-6"), expressionParser.parseAndEvaluate("3 * -2"));
            assertEquals(new BigDecimal("5"), expressionParser.parseAndEvaluate("-(-5)"));
            assertEquals(new BigDecimal("-5"), expressionParser.parseAndEvaluate("-(2 + 3)"));
        }

        @Test
        @DisplayName("Mathematical constants pi and e")
        void testConstants() {
            BigDecimal piVal = expressionParser.parseAndEvaluate("pi");
            assertTrue(piVal.toPlainString().startsWith("3.14159"));

            BigDecimal eVal = expressionParser.parseAndEvaluate("e");
            assertTrue(eVal.toPlainString().startsWith("2.71828"));

            BigDecimal twoPi = expressionParser.parseAndEvaluate("2 * pi");
            assertTrue(twoPi.toPlainString().startsWith("6.28318"));
        }

        @Test
        @DisplayName("Scientific functions in radians and degrees")
        void testScientificFunctions() {
            // Sin / Cos / Tan
            assertEquals(BigDecimal.ZERO, expressionParser.parseAndEvaluate("sin(0)"));
            assertEquals(BigDecimal.ONE, expressionParser.parseAndEvaluate("sin(90)", true));
            assertEquals(BigDecimal.ONE, expressionParser.parseAndEvaluate("cos(0)"));
            assertEquals(BigDecimal.ZERO, expressionParser.parseAndEvaluate("cos(90)", true));
            assertEquals(BigDecimal.ZERO, expressionParser.parseAndEvaluate("tan(0)"));
            assertEquals(BigDecimal.ONE, expressionParser.parseAndEvaluate("tan(45)", true));

            // Sqrt
            assertEquals(new BigDecimal("4"), expressionParser.parseAndEvaluate("sqrt(16)"));
            assertEquals(new BigDecimal("1.5"), expressionParser.parseAndEvaluate("sqrt(2.25)"));

            // Log and Log10
            BigDecimal logE = expressionParser.parseAndEvaluate("log(e)");
            assertEquals(1.0, logE.doubleValue(), 1e-6);

            BigDecimal log100 = expressionParser.parseAndEvaluate("log10(100)");
            assertEquals(new BigDecimal("2"), log100);

            // Abs, Ceil, Floor, Round
            assertEquals(new BigDecimal("42"), expressionParser.parseAndEvaluate("abs(-42)"));
            assertEquals(new BigDecimal("4"), expressionParser.parseAndEvaluate("ceil(3.2)"));
            assertEquals(new BigDecimal("3"), expressionParser.parseAndEvaluate("floor(3.8)"));
            assertEquals(new BigDecimal("4"), expressionParser.parseAndEvaluate("round(3.6)"));
        }

        @Test
        @DisplayName("Factorial function and postfix operator")
        void testFactorial() {
            assertEquals(new BigDecimal("120"), expressionParser.parseAndEvaluate("factorial(5)"));
            assertEquals(new BigDecimal("1"), expressionParser.parseAndEvaluate("factorial(0)"));
            assertEquals(new BigDecimal("1"), expressionParser.parseAndEvaluate("factorial(1)"));
            assertEquals(new BigDecimal("120"), expressionParser.parseAndEvaluate("5!"));
            assertEquals(new BigDecimal("120"), expressionParser.parseAndEvaluate("(3 + 2)!"));
        }

        @Test
        @DisplayName("Division and modulo by zero exceptions")
        void testDivisionByZero() {
            assertThrows(DivisionByZeroException.class, () -> expressionParser.parseAndEvaluate("10 / 0"));
            assertThrows(DivisionByZeroException.class, () -> expressionParser.parseAndEvaluate("5 % 0"));
        }

        @Test
        @DisplayName("Domain error exceptions")
        void testDomainErrors() {
            assertThrows(DomainErrorException.class, () -> expressionParser.parseAndEvaluate("sqrt(-4)"));
            assertThrows(DomainErrorException.class, () -> expressionParser.parseAndEvaluate("log(0)"));
            assertThrows(DomainErrorException.class, () -> expressionParser.parseAndEvaluate("log(-5)"));
            assertThrows(DomainErrorException.class, () -> expressionParser.parseAndEvaluate("asin(2)"));
            assertThrows(DomainErrorException.class, () -> expressionParser.parseAndEvaluate("tan(90)", true));
            assertThrows(DomainErrorException.class, () -> expressionParser.parseAndEvaluate("factorial(-1)"));
        }

        @Test
        @DisplayName("Invalid expression syntax exceptions")
        void testInvalidExpressions() {
            assertThrows(InvalidExpressionException.class, () -> expressionParser.parseAndEvaluate("2 +"));
            assertThrows(InvalidExpressionException.class, () -> expressionParser.parseAndEvaluate("((2 + 3)"));
            assertThrows(InvalidExpressionException.class, () -> expressionParser.parseAndEvaluate("unknownFunc(5)"));
            assertThrows(InvalidExpressionException.class, () -> expressionParser.parseAndEvaluate(""));
            assertThrows(InvalidExpressionException.class, () -> expressionParser.parseAndEvaluate("   "));
        }
    }

    @Nested
    @DisplayName("FinancialService Tests")
    class FinancialServiceTests {

        @Test
        @DisplayName("EMI calculation and amortization schedule")
        void testEmiCalculation() {
            FinancialEmiRequest request = new FinancialEmiRequest(
                    new BigDecimal("100000"),
                    new BigDecimal("10"),
                    12,
                    "USD"
            );
            FinancialEmiResponse response = financialService.calculateEmi(request);

            assertNotNull(response);
            assertNotNull(response.emi());
            // Expected monthly EMI for 100000 at 10% for 12 months is approximately 8791.59
            assertEquals(new BigDecimal("8791.59"), response.emi());
            assertTrue(response.totalPayment().compareTo(new BigDecimal("100000")) > 0);
            assertEquals(12, response.schedule().size());

            // Check final month amortization row balance is 0.00
            AmortizationRow finalRow = response.schedule().get(11);
            assertEquals(12, finalRow.month());
            assertEquals(new BigDecimal("0.00"), finalRow.balance());
        }

        @Test
        @DisplayName("Zero-interest EMI calculation")
        void testZeroInterestEmi() {
            FinancialEmiRequest request = new FinancialEmiRequest(
                    new BigDecimal("12000"),
                    BigDecimal.ZERO,
                    12,
                    "USD"
            );
            FinancialEmiResponse response = financialService.calculateEmi(request);

            assertEquals(new BigDecimal("1000.00"), response.emi());
            assertEquals(new BigDecimal("12000.00"), response.totalPayment());
            assertEquals(new BigDecimal("0.00"), response.totalInterest());
        }

        @Test
        @DisplayName("Compound interest calculation")
        void testCompoundInterest() {
            CompoundInterestRequest request = new CompoundInterestRequest(
                    new BigDecimal("10000"),
                    new BigDecimal("5"),
                    2,
                    1,
                    "USD"
            );
            CompoundInterestResponse response = financialService.calculateCompoundInterest(request);

            // Amount = 10000 * (1 + 0.05)^2 = 11025.00
            assertEquals(new BigDecimal("11025.00"), response.amount());
            assertEquals(new BigDecimal("1025.00"), response.interest());
        }

        @Test
        @DisplayName("Simple interest calculation")
        void testSimpleInterest() {
            SimpleInterestRequest request = new SimpleInterestRequest(
                    new BigDecimal("10000"),
                    new BigDecimal("5"),
                    2,
                    "USD"
            );
            SimpleInterestResponse response = financialService.calculateSimpleInterest(request);

            // SI = 10000 * 5 * 2 / 100 = 1000.00
            assertEquals(new BigDecimal("1000.00"), response.interest());
            assertEquals(new BigDecimal("11000.00"), response.totalAmount());
        }
    }

    @Nested
    @DisplayName("StatisticsService Tests")
    class StatisticsServiceTests {

        @Test
        @DisplayName("Statistical computations: mean, median, mode, variance, stdDev")
        void testStatisticsCalculations() {
            List<BigDecimal> data = Arrays.asList(
                    new BigDecimal("2"),
                    new BigDecimal("4"),
                    new BigDecimal("4"),
                    new BigDecimal("4"),
                    new BigDecimal("5"),
                    new BigDecimal("5"),
                    new BigDecimal("7"),
                    new BigDecimal("9")
            );

            StatisticsRequest request = new StatisticsRequest(data);
            StatisticsResponse response = statisticsService.calculate(request);

            assertEquals(8, response.count());
            assertEquals(new BigDecimal("40"), response.sum());
            assertEquals(new BigDecimal("5"), response.mean());
            assertEquals(new BigDecimal("4.5"), response.median());
            assertEquals(List.of(new BigDecimal("4")), response.mode());
            assertEquals(new BigDecimal("2"), response.min());
            assertEquals(new BigDecimal("9"), response.max());
            assertEquals(new BigDecimal("7"), response.range());

            // Population variance: 4
            assertEquals(new BigDecimal("4"), response.variance());
            // Population standard deviation: 2
            assertEquals(new BigDecimal("2"), response.stdDev());

            // Sample variance: 32 / 7 = 4.57142857
            assertEquals(new BigDecimal("4.57142857"), response.sampleVariance());
        }
    }

    @Nested
    @DisplayName("ConverterService Tests")
    class ConverterServiceTests {

        @Test
        @DisplayName("Length conversions")
        void testLengthConversions() {
            ConvertResponse mmToM = converterService.convert(
                    new ConvertRequest(new BigDecimal("1000"), "mm", "m", "LENGTH"));
            assertEquals(new BigDecimal("1"), mmToM.result());

            ConvertResponse kmToM = converterService.convert(
                    new ConvertRequest(new BigDecimal("1"), "km", "m", "LENGTH"));
            assertEquals(new BigDecimal("1000"), kmToM.result());

            ConvertResponse inToCm = converterService.convert(
                    new ConvertRequest(new BigDecimal("1"), "in", "cm", "LENGTH"));
            assertEquals(new BigDecimal("2.54"), inToCm.result());
        }

        @Test
        @DisplayName("Mass conversions")
        void testMassConversions() {
            ConvertResponse kgToG = converterService.convert(
                    new ConvertRequest(new BigDecimal("1"), "kg", "g", "MASS"));
            assertEquals(new BigDecimal("1000"), kgToG.result());

            ConvertResponse mgToG = converterService.convert(
                    new ConvertRequest(new BigDecimal("1000"), "mg", "g", "MASS"));
            assertEquals(new BigDecimal("1"), mgToG.result());

            ConvertResponse tToKg = converterService.convert(
                    new ConvertRequest(new BigDecimal("1"), "t", "kg", "MASS"));
            assertEquals(new BigDecimal("1000"), tToKg.result());
        }

        @Test
        @DisplayName("Temperature conversions")
        void testTemperatureConversions() {
            ConvertResponse cToF = converterService.convert(
                    new ConvertRequest(new BigDecimal("0"), "C", "F", "TEMPERATURE"));
            assertEquals(new BigDecimal("32"), cToF.result());

            ConvertResponse cToF100 = converterService.convert(
                    new ConvertRequest(new BigDecimal("100"), "C", "F", "TEMPERATURE"));
            assertEquals(new BigDecimal("212"), cToF100.result());

            ConvertResponse fToC = converterService.convert(
                    new ConvertRequest(new BigDecimal("32"), "F", "C", "TEMPERATURE"));
            assertEquals(new BigDecimal("0"), fToC.result());

            ConvertResponse cToK = converterService.convert(
                    new ConvertRequest(new BigDecimal("0"), "C", "K", "TEMPERATURE"));
            assertEquals(new BigDecimal("273.15"), cToK.result());

            ConvertResponse kToC = converterService.convert(
                    new ConvertRequest(new BigDecimal("273.15"), "K", "C", "TEMPERATURE"));
            assertEquals(new BigDecimal("0"), kToC.result());
        }

        @Test
        @DisplayName("Data conversions (binary 1024 base)")
        void testDataConversions() {
            ConvertResponse bToKb = converterService.convert(
                    new ConvertRequest(new BigDecimal("1024"), "B", "KB", "DATA"));
            assertEquals(new BigDecimal("1"), bToKb.result());

            ConvertResponse mbToKb = converterService.convert(
                    new ConvertRequest(new BigDecimal("1"), "MB", "KB", "DATA"));
            assertEquals(new BigDecimal("1024"), mbToKb.result());

            ConvertResponse gbToMb = converterService.convert(
                    new ConvertRequest(new BigDecimal("1"), "GB", "MB", "DATA"));
            assertEquals(new BigDecimal("1024"), gbToMb.result());
        }
    }

    @Nested
    @DisplayName("ExportService Tests")
    class ExportServiceTests {

        @Test
        @DisplayName("Export history to CSV and PDF")
        void testCsvAndPdfExport() throws IOException {
            List<HistoryResponse> sampleHistory = List.of(
                    new HistoryResponse(1L, "2 + 2", "4", "STANDARD", "2026-10-29 10:00:00"),
                    new HistoryResponse(2L, "sin(90)", "1", "SCIENTIFIC", "2026-10-29 10:05:00")
            );

            byte[] csvBytes = exportService.generateCSV(sampleHistory);
            assertNotNull(csvBytes);
            assertTrue(csvBytes.length > 0);
            String csvContent = new String(csvBytes);
            assertTrue(csvContent.contains("2 + 2"));
            assertTrue(csvContent.contains("STANDARD"));

            byte[] pdfBytes = exportService.generatePDF(sampleHistory);
            assertNotNull(pdfBytes);
            assertTrue(pdfBytes.length > 0);
            // PDF file starts with %PDF-
            assertEquals('%', (char) pdfBytes[0]);
            assertEquals('P', (char) pdfBytes[1]);
            assertEquals('D', (char) pdfBytes[2]);
            assertEquals('F', (char) pdfBytes[3]);
        }
    }
}
