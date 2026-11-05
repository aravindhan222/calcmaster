package com.calcmaster.exception;

import com.calcmaster.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining("; "));
        if (detail.isEmpty()) {
            detail = ex.getMessage();
        }

        ErrorResponse response = new ErrorResponse(
                "Validation Error",
                detail,
                HttpStatus.BAD_REQUEST.value(),
                LocalDateTime.now().format(FORMATTER)
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        ErrorResponse response = new ErrorResponse(
                "Bad Request",
                ex.getMessage(),
                HttpStatus.BAD_REQUEST.value(),
                LocalDateTime.now().format(FORMATTER)
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ArithmeticException.class)
    public ResponseEntity<ErrorResponse> handleArithmeticException(ArithmeticException ex) {
        ErrorResponse response = new ErrorResponse(
                "Arithmetic Error",
                ex.getMessage(),
                HttpStatus.BAD_REQUEST.value(),
                LocalDateTime.now().format(FORMATTER)
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ExpressionException.class)
    public ResponseEntity<ErrorResponse> handleExpressionException(ExpressionException ex) {
        ErrorResponse response = new ErrorResponse(
                ex.getClass().getSimpleName(),
                ex.getMessage(),
                HttpStatus.BAD_REQUEST.value(),
                LocalDateTime.now().format(FORMATTER)
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
        ErrorResponse response = new ErrorResponse(
                "Internal Server Error",
                ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred",
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                LocalDateTime.now().format(FORMATTER)
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
