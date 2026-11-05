package com.calcmaster.controller;

import com.calcmaster.dto.HistoryResponse;
import com.calcmaster.service.HistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryService historyService;

    public HistoryController(HistoryService historyService) {
        this.historyService = historyService;
    }

    @GetMapping
    public ResponseEntity<List<HistoryResponse>> getHistory(@RequestParam(required = false) String type) {
        List<HistoryResponse> list = historyService.getByType(type);
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHistoryItem(@PathVariable Long id) {
        historyService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearAllHistory() {
        historyService.clearAll();
        return ResponseEntity.noContent().build();
    }
}
