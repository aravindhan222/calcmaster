package com.calcmaster.service;

import com.calcmaster.dto.HistoryResponse;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class ExportService {

    public byte[] generateCSV(List<HistoryResponse> historyList) throws IOException {
        StringWriter writer = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("ID", "Timestamp", "Type", "Expression", "Result")
                .build();

        try (CSVPrinter printer = new CSVPrinter(writer, format)) {
            for (HistoryResponse item : historyList) {
                printer.printRecord(
                        item.id(),
                        item.timestamp(),
                        item.type(),
                        item.expression(),
                        item.result()
                );
            }
        }

        return writer.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] generatePDF(List<HistoryResponse> historyList) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDFont fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDFont fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            PDPageContentStream contentStream = new PDPageContentStream(document, page);

            float y = 800;
            float margin = 40;

            // Document Header
            contentStream.beginText();
            contentStream.setFont(fontBold, 16);
            contentStream.newLineAtOffset(margin, y);
            contentStream.showText("CalcMaster - Calculation History Report");
            contentStream.endText();

            y -= 25;

            // Table Header
            contentStream.beginText();
            contentStream.setFont(fontBold, 9);
            contentStream.newLineAtOffset(margin, y);
            contentStream.showText(String.format("%-6s %-14s %-20s %-32s %s", "ID", "Type", "Timestamp", "Expression", "Result"));
            contentStream.endText();

            y -= 10;

            // Divider Line
            contentStream.moveTo(margin, y);
            contentStream.lineTo(555, y);
            contentStream.stroke();

            y -= 15;

            // Table Rows
            for (HistoryResponse item : historyList) {
                if (y < 50) {
                    contentStream.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    contentStream = new PDPageContentStream(document, page);
                    y = 800;
                }

                String idStr = String.valueOf(item.id() != null ? item.id() : "");
                String typeStr = item.type() != null ? item.type() : "";
                String timeStr = item.timestamp() != null ? item.timestamp() : "";
                if (timeStr.length() > 19) timeStr = timeStr.substring(0, 19);

                String exprStr = item.expression() != null ? item.expression() : "";
                if (exprStr.length() > 30) exprStr = exprStr.substring(0, 27) + "...";
                exprStr = sanitizeForPdf(exprStr);

                String resStr = item.result() != null ? item.result() : "";
                if (resStr.length() > 30) resStr = resStr.substring(0, 27) + "...";
                resStr = sanitizeForPdf(resStr);

                contentStream.beginText();
                contentStream.setFont(fontRegular, 8);
                contentStream.newLineAtOffset(margin, y);
                contentStream.showText(String.format("%-6s %-14s %-20s %-32s %s", idStr, typeStr, timeStr, exprStr, resStr));
                contentStream.endText();

                y -= 14;
            }

            contentStream.close();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private String sanitizeForPdf(String text) {
        if (text == null) return "";
        return text.replace("\r", " ")
                .replace("\n", " ")
                .replace("\t", " ")
                .replace("π", "pi")
                .replace("√", "sqrt")
                .replace("×", "*")
                .replace("÷", "/")
                .replace("°", " deg ")
                .replaceAll("[^\\x20-\\x7E]", "?");
    }
}
