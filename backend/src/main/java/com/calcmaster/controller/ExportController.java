package com.calcmaster.controller;

import com.calcmaster.dto.HistoryResponse;
import com.calcmaster.service.ExportService;
import com.calcmaster.service.HistoryService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final HistoryService historyService;
    private final ExportService exportService;

    public ExportController(HistoryService historyService, ExportService exportService) {
        this.historyService = historyService;
        this.exportService = exportService;
    }

    @GetMapping("/csv")
    public ResponseEntity<byte[]> exportCSV(@RequestParam(required = false) String type) throws IOException {
        List<HistoryResponse> history = historyService.getByType(type);
        byte[] csvData = exportService.generateCSV(history);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"calculation-history.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> exportPDF(@RequestParam(required = false) String type) throws IOException {
        List<HistoryResponse> history = historyService.getByType(type);
        byte[] pdfData = exportService.generatePDF(history);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"calculation-history.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfData);
    }
}
