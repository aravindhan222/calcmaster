package com.calcmaster.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "calculation_history")
public class CalculationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String expression;

    @Column(nullable = false, length = 1000)
    private String result;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    // Required no-arg constructor for Hibernate/JPA
    public CalculationHistory() {}

    public CalculationHistory(String expression, String result, String type) {
        this.expression = expression;
        this.result = result;
        this.type = type;
        this.timestamp = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public String getExpression() { return expression; }
    public String getResult() { return result; }
    public String getType() { return type; }
    public LocalDateTime getTimestamp() { return timestamp; }

    public void setId(Long id) { this.id = id; }
    public void setExpression(String expression) { this.expression = expression; }
    public void setResult(String result) { this.result = result; }
    public void setType(String type) { this.type = type; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
