package com.calcmaster.service;

import com.calcmaster.dto.HistoryResponse;
import com.calcmaster.entity.CalculationHistory;
import com.calcmaster.repository.HistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Transactional
public class HistoryService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final HistoryRepository historyRepository;

    public HistoryService(HistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    @Transactional(readOnly = true)
    public List<HistoryResponse> getAll() {
        return historyRepository.findAllByOrderByTimestampDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HistoryResponse> getByType(String type) {
        if (type == null || type.trim().isEmpty()) {
            return getAll();
        }
        return historyRepository.findByTypeOrderByTimestampDesc(type.trim().toUpperCase())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public void deleteById(Long id) {
        historyRepository.deleteById(id);
    }

    public void clearAll() {
        historyRepository.deleteAll();
    }

    private HistoryResponse toResponse(CalculationHistory history) {
        String formattedTimestamp = history.getTimestamp() != null
                ? history.getTimestamp().format(FORMATTER)
                : "";
        return new HistoryResponse(
                history.getId(),
                history.getExpression(),
                history.getResult(),
                history.getType(),
                formattedTimestamp
        );
    }
}
