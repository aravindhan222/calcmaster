package com.calcmaster.parser;

import com.calcmaster.exception.DivisionByZeroException;
import com.calcmaster.exception.DomainErrorException;
import com.calcmaster.exception.InvalidExpressionException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.*;

/**
 * Implementation of the Shunting-Yard algorithm for mathematical expression parsing
 * and evaluation. Supports operators, unary minus, functions, constants, parentheses,
 * and customizable trigonometric modes (radians or degrees).
 */
@Component
public class ExpressionParser {

    public static final MathContext MC = MathContext.DECIMAL128;

    public static final BigDecimal PI = new BigDecimal("3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679");
    public static final BigDecimal E = new BigDecimal("2.7182818284590452353602874713526624977572470936999595749669676277240766303535475945713821785251664274");

    private enum TokenType {
        NUMBER,
        OPERATOR,
        FUNCTION,
        LPAREN,
        RPAREN,
        COMMA
    }

    private static class Token {
        final TokenType type;
        final String text;
        final BigDecimal numberValue;

        Token(TokenType type, String text, BigDecimal numberValue) {
            this.type = type;
            this.text = text;
            this.numberValue = numberValue;
        }

        static Token number(BigDecimal val) {
            return new Token(TokenType.NUMBER, val.toPlainString(), val);
        }

        static Token op(String op) {
            return new Token(TokenType.OPERATOR, op, null);
        }

        static Token function(String fn) {
            return new Token(TokenType.FUNCTION, fn.toLowerCase(Locale.ROOT), null);
        }

        static Token lparen() {
            return new Token(TokenType.LPAREN, "(", null);
        }

        static Token rparen() {
            return new Token(TokenType.RPAREN, ")", null);
        }

        static Token comma() {
            return new Token(TokenType.COMMA, ",", null);
        }

        @Override
        public String toString() {
            return type + (text != null ? "(" + text + ")" : "");
        }
    }

    public BigDecimal parseAndEvaluate(String expression) {
        return parseAndEvaluate(expression, false);
    }

    public BigDecimal parseAndEvaluate(String expression, boolean degreesMode) {
        if (expression == null || expression.trim().isEmpty()) {
            throw new InvalidExpressionException("Expression cannot be null or empty");
        }

        List<Token> tokens = tokenize(expression.trim());
        if (tokens.isEmpty()) {
            throw new InvalidExpressionException("Expression contains no valid tokens");
        }

        List<Token> rpn = toRpn(tokens);
        return evaluateRpn(rpn, degreesMode);
    }

    private List<Token> tokenize(String expr) {
        List<Token> tokens = new ArrayList<>();
        int i = 0;
        int n = expr.length();
        boolean mayBeUnary = true;

        while (i < n) {
            char ch = expr.charAt(i);

            if (Character.isWhitespace(ch)) {
                i++;
                continue;
            }

            // Number: digit or decimal point followed by digit
            if (Character.isDigit(ch) || (ch == '.' && i + 1 < n && Character.isDigit(expr.charAt(i + 1)))) {
                int start = i;
                boolean seenDot = (ch == '.');
                i++;
                while (i < n) {
                    char c = expr.charAt(i);
                    if (Character.isDigit(c)) {
                        i++;
                    } else if (c == '.' && !seenDot) {
                        seenDot = true;
                        i++;
                    } else {
                        break;
                    }
                }
                String numStr = expr.substring(start, i);
                try {
                    BigDecimal val = new BigDecimal(numStr);
                    tokens.add(Token.number(val));
                    mayBeUnary = false;
                } catch (NumberFormatException e) {
                    throw new InvalidExpressionException("Invalid numeric value: " + numStr);
                }
                continue;
            }

            // Word: functions or constants
            if (Character.isLetter(ch)) {
                int start = i;
                while (i < n && (Character.isLetterOrDigit(expr.charAt(i)) || expr.charAt(i) == '_')) {
                    i++;
                }
                String word = expr.substring(start, i).toLowerCase(Locale.ROOT);

                if ("pi".equals(word)) {
                    if (!mayBeUnary) {
                        tokens.add(Token.op("*"));
                    }
                    tokens.add(Token.number(PI));
                    mayBeUnary = false;
                } else if ("e".equals(word)) {
                    if (!mayBeUnary) {
                        tokens.add(Token.op("*"));
                    }
                    tokens.add(Token.number(E));
                    mayBeUnary = false;
                } else {
                    if (!mayBeUnary) {
                        tokens.add(Token.op("*"));
                    }
                    tokens.add(Token.function(word));
                    mayBeUnary = true;
                }
                continue;
            }

            // Parentheses and Comma
            if (ch == '(') {
                if (!mayBeUnary) {
                    tokens.add(Token.op("*"));
                }
                tokens.add(Token.lparen());
                mayBeUnary = true;
                i++;
                continue;
            }

            if (ch == ')') {
                tokens.add(Token.rparen());
                mayBeUnary = false;
                i++;
                continue;
            }

            if (ch == ',') {
                tokens.add(Token.comma());
                mayBeUnary = true;
                i++;
                continue;
            }

            // Factorial operator
            if (ch == '!') {
                tokens.add(Token.op("!"));
                mayBeUnary = false;
                i++;
                continue;
            }

            // Operators
            if (ch == '+' || ch == '-' || ch == '*' || ch == '×' || ch == '/' || ch == '÷' || ch == '%' || ch == '^') {
                String opStr = String.valueOf(ch);
                if (ch == '×') opStr = "*";
                if (ch == '÷') opStr = "/";

                if (ch == '+') {
                    if (mayBeUnary) {
                        // Unary plus is a no-op
                        i++;
                        continue;
                    }
                    tokens.add(Token.op("+"));
                    mayBeUnary = true;
                } else if (ch == '-') {
                    if (mayBeUnary) {
                        tokens.add(Token.op("u-"));
                        mayBeUnary = true;
                    } else {
                        tokens.add(Token.op("-"));
                        mayBeUnary = true;
                    }
                } else {
                    tokens.add(Token.op(opStr));
                    mayBeUnary = true;
                }
                i++;
                continue;
            }

            throw new InvalidExpressionException("Unexpected character in expression: '" + ch + "' at position " + i);
        }

        return tokens;
    }

    private int precedence(String op) {
        return switch (op) {
            case "+", "-" -> 1;
            case "*", "/", "%" -> 2;
            case "^" -> 4;
            case "u-" -> 5;
            case "!" -> 6;
            default -> 0;
        };
    }

    private boolean isRightAssociative(String op) {
        return "^".equals(op) || "u-".equals(op);
    }

    private List<Token> toRpn(List<Token> tokens) {
        List<Token> output = new ArrayList<>();
        Deque<Token> stack = new ArrayDeque<>();

        for (Token token : tokens) {
            switch (token.type) {
                case NUMBER -> output.add(token);
                case FUNCTION -> stack.push(token);
                case LPAREN -> stack.push(token);
                case RPAREN -> {
                    boolean foundLparen = false;
                    while (!stack.isEmpty()) {
                        Token top = stack.pop();
                        if (top.type == TokenType.LPAREN) {
                            foundLparen = true;
                            break;
                        }
                        output.add(top);
                    }
                    if (!foundLparen) {
                        throw new InvalidExpressionException("Mismatched parentheses: closing parenthesis has no match");
                    }
                    if (!stack.isEmpty() && stack.peek().type == TokenType.FUNCTION) {
                        output.add(stack.pop());
                    }
                }
                case COMMA -> {
                    boolean foundLparen = false;
                    while (!stack.isEmpty()) {
                        if (stack.peek().type == TokenType.LPAREN) {
                            foundLparen = true;
                            break;
                        }
                        output.add(stack.pop());
                    }
                    if (!foundLparen) {
                        throw new InvalidExpressionException("Misplaced comma or mismatched parentheses");
                    }
                }
                case OPERATOR -> {
                    String op1 = token.text;
                    if ("!".equals(op1)) {
                        output.add(token);
                        break;
                    }

                    int p1 = precedence(op1);
                    boolean rightAssoc = isRightAssociative(op1);

                    while (!stack.isEmpty() && stack.peek().type == TokenType.OPERATOR) {
                        String op2 = stack.peek().text;
                        int p2 = precedence(op2);

                        if ((!rightAssoc && p1 <= p2) || (rightAssoc && p1 < p2)) {
                            output.add(stack.pop());
                        } else {
                            break;
                        }
                    }
                    stack.push(token);
                }
            }
        }

        while (!stack.isEmpty()) {
            Token top = stack.pop();
            if (top.type == TokenType.LPAREN || top.type == TokenType.RPAREN) {
                throw new InvalidExpressionException("Mismatched parentheses in expression");
            }
            output.add(top);
        }

        return output;
    }

    private BigDecimal evaluateRpn(List<Token> rpn, boolean degreesMode) {
        Deque<BigDecimal> stack = new ArrayDeque<>();

        for (Token token : rpn) {
            switch (token.type) {
                case NUMBER -> stack.push(token.numberValue);
                case OPERATOR -> {
                    String op = token.text;
                    if ("u-".equals(op)) {
                        if (stack.isEmpty()) {
                            throw new InvalidExpressionException("Missing operand for unary minus");
                        }
                        BigDecimal a = stack.pop();
                        stack.push(a.negate(MC));
                    } else if ("!".equals(op)) {
                        if (stack.isEmpty()) {
                            throw new InvalidExpressionException("Missing operand for factorial");
                        }
                        BigDecimal a = stack.pop();
                        stack.push(evalFactorial(a));
                    } else {
                        if (stack.size() < 2) {
                            throw new InvalidExpressionException("Missing operands for operator: " + op);
                        }
                        BigDecimal b = stack.pop();
                        BigDecimal a = stack.pop();
                        stack.push(applyBinaryOp(op, a, b));
                    }
                }
                case FUNCTION -> {
                    if (stack.isEmpty()) {
                        throw new InvalidExpressionException("Missing argument for function: " + token.text);
                    }
                    BigDecimal arg = stack.pop();
                    stack.push(applyFunction(token.text, arg, degreesMode));
                }
                default -> throw new InvalidExpressionException("Unexpected token in RPN evaluation: " + token);
            }
        }

        if (stack.size() != 1) {
            throw new InvalidExpressionException("Invalid expression: unbalanced operators and operands");
        }

        BigDecimal result = stack.pop();
        return toPlain(result);
    }

    /**
     * Strip trailing zeros without switching whole numbers into scientific notation
     * (BigDecimal.stripTrailingZeros() would turn 20 into 2E+1).
     */
    public static BigDecimal toPlain(BigDecimal value) {
        if (value == null) {
            return null;
        }
        if (value.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal stripped = value.stripTrailingZeros();
        if (stripped.scale() < 0) {
            stripped = stripped.setScale(0);
        }
        return stripped;
    }

    private BigDecimal applyBinaryOp(String op, BigDecimal a, BigDecimal b) {
        return switch (op) {
            case "+" -> a.add(b, MC);
            case "-" -> a.subtract(b, MC);
            case "*" -> a.multiply(b, MC);
            case "/" -> {
                if (b.compareTo(BigDecimal.ZERO) == 0) {
                    throw new DivisionByZeroException("Division by zero");
                }
                yield a.divide(b, MC);
            }
            case "%" -> {
                if (b.compareTo(BigDecimal.ZERO) == 0) {
                    throw new DivisionByZeroException("Modulo by zero");
                }
                yield a.remainder(b, MC);
            }
            case "^" -> evalPower(a, b);
            default -> throw new InvalidExpressionException("Unknown operator: " + op);
        };
    }

    private BigDecimal evalPower(BigDecimal a, BigDecimal b) {
        if (a.compareTo(BigDecimal.ZERO) == 0 && b.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DivisionByZeroException("Zero raised to non-positive power: 0 ^ " + b);
        }

        try {
            int exp = b.intValueExact();
            if (exp >= 0) {
                return a.pow(exp, MC);
            } else {
                BigDecimal positivePow = a.pow(-exp, MC);
                if (positivePow.compareTo(BigDecimal.ZERO) == 0) {
                    throw new DivisionByZeroException("Division by zero in negative power evaluation");
                }
                return BigDecimal.ONE.divide(positivePow, MC);
            }
        } catch (ArithmeticException nonExactInt) {
            if (a.compareTo(BigDecimal.ZERO) < 0) {
                throw new DomainErrorException("Negative base with non-integer exponent: " + a + " ^ " + b);
            }
            double res = Math.pow(a.doubleValue(), b.doubleValue());
            if (Double.isNaN(res) || Double.isInfinite(res)) {
                throw new DomainErrorException("Result of " + a + " ^ " + b + " is out of range or undefined");
            }
            return roundDouble(res);
        }
    }

    private BigDecimal applyFunction(String func, BigDecimal arg, boolean degreesMode) {
        return switch (func) {
            case "sin" -> evalSin(arg, degreesMode);
            case "cos" -> evalCos(arg, degreesMode);
            case "tan" -> evalTan(arg, degreesMode);
            case "asin" -> evalAsin(arg, degreesMode);
            case "acos" -> evalAcos(arg, degreesMode);
            case "atan" -> evalAtan(arg, degreesMode);
            case "sqrt" -> evalSqrt(arg);
            case "log" -> evalLog(arg);
            case "log10" -> evalLog10(arg);
            case "abs" -> arg.abs(MC);
            case "ceil" -> BigDecimal.valueOf(Math.ceil(arg.doubleValue()));
            case "floor" -> BigDecimal.valueOf(Math.floor(arg.doubleValue()));
            case "round" -> BigDecimal.valueOf(Math.round(arg.doubleValue()));
            case "factorial", "fact" -> evalFactorial(arg);
            default -> throw new InvalidExpressionException("Unknown function: " + func);
        };
    }

    private BigDecimal evalSin(BigDecimal arg, boolean degreesMode) {
        if (degreesMode) {
            double deg = arg.doubleValue();
            double normalized = deg % 360.0;
            if (normalized < 0) normalized += 360.0;

            if (Math.abs(normalized) < 1e-12 || Math.abs(normalized - 180.0) < 1e-12 || Math.abs(normalized - 360.0) < 1e-12) {
                return BigDecimal.ZERO;
            }
            if (Math.abs(normalized - 90.0) < 1e-12) {
                return BigDecimal.ONE;
            }
            if (Math.abs(normalized - 270.0) < 1e-12) {
                return BigDecimal.valueOf(-1);
            }
            return roundDouble(Math.sin(Math.toRadians(deg)));
        } else {
            return roundDouble(Math.sin(arg.doubleValue()));
        }
    }

    private BigDecimal evalCos(BigDecimal arg, boolean degreesMode) {
        if (degreesMode) {
            double deg = arg.doubleValue();
            double normalized = deg % 360.0;
            if (normalized < 0) normalized += 360.0;

            if (Math.abs(normalized - 90.0) < 1e-12 || Math.abs(normalized - 270.0) < 1e-12) {
                return BigDecimal.ZERO;
            }
            if (Math.abs(normalized) < 1e-12 || Math.abs(normalized - 360.0) < 1e-12) {
                return BigDecimal.ONE;
            }
            if (Math.abs(normalized - 180.0) < 1e-12) {
                return BigDecimal.valueOf(-1);
            }
            return roundDouble(Math.cos(Math.toRadians(deg)));
        } else {
            return roundDouble(Math.cos(arg.doubleValue()));
        }
    }

    private BigDecimal evalTan(BigDecimal arg, boolean degreesMode) {
        if (degreesMode) {
            double deg = arg.doubleValue();
            double norm180 = Math.abs(deg) % 180.0;
            if (Math.abs(norm180 - 90.0) < 1e-9) {
                throw new DomainErrorException("Tangent is undefined for angle " + arg + "°");
            }
            if (Math.abs(norm180) < 1e-12 || Math.abs(norm180 - 180.0) < 1e-12) {
                return BigDecimal.ZERO;
            }
            return roundDouble(Math.tan(Math.toRadians(deg)));
        } else {
            double cosVal = Math.cos(arg.doubleValue());
            if (Math.abs(cosVal) < 1e-14) {
                throw new DomainErrorException("Tangent is undefined (cosine equals zero)");
            }
            return roundDouble(Math.tan(arg.doubleValue()));
        }
    }

    private BigDecimal evalAsin(BigDecimal arg, boolean degreesMode) {
        double val = arg.doubleValue();
        if (val < -1.0 || val > 1.0) {
            throw new DomainErrorException("asin domain error: value must be in range [-1, 1], got " + arg);
        }
        double rad = Math.asin(val);
        return degreesMode ? roundDouble(Math.toDegrees(rad)) : roundDouble(rad);
    }

    private BigDecimal evalAcos(BigDecimal arg, boolean degreesMode) {
        double val = arg.doubleValue();
        if (val < -1.0 || val > 1.0) {
            throw new DomainErrorException("acos domain error: value must be in range [-1, 1], got " + arg);
        }
        double rad = Math.acos(val);
        return degreesMode ? roundDouble(Math.toDegrees(rad)) : roundDouble(rad);
    }

    private BigDecimal evalAtan(BigDecimal arg, boolean degreesMode) {
        double rad = Math.atan(arg.doubleValue());
        return degreesMode ? roundDouble(Math.toDegrees(rad)) : roundDouble(rad);
    }

    private BigDecimal evalSqrt(BigDecimal arg) {
        if (arg.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainErrorException("Square root domain error: cannot calculate square root of negative number: " + arg);
        }
        return arg.sqrt(MC);
    }

    private BigDecimal evalLog(BigDecimal arg) {
        if (arg.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainErrorException("Natural log domain error: argument must be positive, got " + arg);
        }
        return roundDouble(Math.log(arg.doubleValue()));
    }

    private BigDecimal evalLog10(BigDecimal arg) {
        if (arg.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainErrorException("Log10 domain error: argument must be positive, got " + arg);
        }
        return roundDouble(Math.log10(arg.doubleValue()));
    }

    private BigDecimal evalFactorial(BigDecimal arg) {
        try {
            int n = arg.intValueExact();
            return factorial(n);
        } catch (ArithmeticException e) {
            throw new DomainErrorException("Factorial domain error: input must be a non-negative integer: " + arg);
        }
    }

    public static BigDecimal factorial(int n) {
        if (n < 0) {
            throw new DomainErrorException("Factorial domain error: negative input: " + n);
        }
        if (n > 5000) {
            throw new ArithmeticException("Factorial input too large: " + n + " (limit is 5000)");
        }
        if (n == 0 || n == 1) {
            return BigDecimal.ONE;
        }

        BigInteger result = BigInteger.ONE;
        for (int i = 2; i <= n; i++) {
            result = result.multiply(BigInteger.valueOf(i));
        }
        return new BigDecimal(result);
    }

    private BigDecimal roundDouble(double val) {
        if (Double.isNaN(val) || Double.isInfinite(val)) {
            throw new DomainErrorException("Evaluation resulted in an undefined or infinite value");
        }
        if (Math.abs(val) < 1e-14) {
            return BigDecimal.ZERO;
        }
        BigDecimal bd = BigDecimal.valueOf(val).round(new MathContext(12, RoundingMode.HALF_UP));
        return toPlain(bd);
    }
}
