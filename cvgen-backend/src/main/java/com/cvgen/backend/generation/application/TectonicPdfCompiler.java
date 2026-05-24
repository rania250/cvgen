package com.cvgen.backend.generation.application;

import com.cvgen.backend.generation.application.exception.PdfCompilationException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service de compilation PDF utilisant Tectonic.
 * Écrit le .tex dans un dossier temporaire, exécute tectonic et retourne le PDF.
 */
@Slf4j
@Service
public class TectonicPdfCompiler {

    private static final float MARGIN = 42;
    private static final float FONT_SIZE = 10;
    private static final float SMALL_FONT_SIZE = 9;
    private static final float TITLE_FONT_SIZE = 22;
    private static final float SECTION_FONT_SIZE = 14;
    private static final float LEADING = 13;
    private static final Pattern SECTION_PATTERN = Pattern.compile("\\\\section\\{([^}]*)}");
    private static final Pattern JOB_PATTERN = Pattern.compile("\\\\begin\\{job(?:long|short)}\\{([^}]*)}\\{([^}]*)}");
    private static final Pattern TEXTBF_PATTERN = Pattern.compile("\\\\textbf\\{([^}]*)}");
    private static final Pattern MULTICOLUMN_PATTERN = Pattern.compile("\\\\multicolumn\\{2}\\{@\\{}X@\\{}}\\{([^}]*)}.*");

    public byte[] compile(String latexContent, String baseFileName) {
        log.info("Génération PDF Java structurée pour: {}", baseFileName);

        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Renderer renderer = new Renderer(document);
            List<Block> blocks = parseBlocks(latexContent);

            for (Block block : blocks) {
                renderer.render(block);
            }

            renderer.close();
            document.save(outputStream);

            byte[] pdfBytes = outputStream.toByteArray();
            log.info("PDF généré avec succès: {} bytes", pdfBytes.length);
            return pdfBytes;
        } catch (IOException e) {
            log.error("Erreur lors de la génération PDF Java", e);
            throw new PdfCompilationException("Erreur lors de la génération PDF", e);
        }
    }

    private List<Block> parseBlocks(String latexContent) {
        String body = latexContent
                .replaceAll("(?s).*?\\\\begin\\{document}", "")
                .replaceAll("(?s)\\\\end\\{document}.*", "");

        List<Block> blocks = new ArrayList<>();
        boolean inHeader = false;

        for (String rawLine : body.split("\\R")) {
            String line = rawLine.trim();
            if (line.isBlank() || line.startsWith("%")) {
                continue;
            }
            if (line.startsWith("\\begin{tabularx}") && blocks.isEmpty()) {
                inHeader = true;
                continue;
            }
            if (line.startsWith("\\end{tabularx}") && inHeader) {
                inHeader = false;
                continue;
            }
            if (inHeader) {
                String clean = cleanLatex(line);
                if (!clean.isBlank()) {
                    blocks.add(new Block(BlockType.HEADER, clean, null));
                }
                continue;
            }

            Matcher sectionMatcher = SECTION_PATTERN.matcher(line);
            if (sectionMatcher.find()) {
                blocks.add(new Block(BlockType.SECTION, cleanLatex(sectionMatcher.group(1)), null));
                continue;
            }

            Matcher jobMatcher = JOB_PATTERN.matcher(line);
            if (jobMatcher.find()) {
                blocks.add(new Block(BlockType.ROW, cleanLatex(jobMatcher.group(1)), cleanLatex(jobMatcher.group(2))));
                continue;
            }

            if (line.startsWith("\\item")) {
                blocks.add(new Block(BlockType.BULLET, cleanLatex(line.replaceFirst("\\\\item", "")), null));
                continue;
            }

            Matcher multicolumnMatcher = MULTICOLUMN_PATTERN.matcher(line);
            if (multicolumnMatcher.matches()) {
                blocks.add(new Block(BlockType.TEXT, cleanLatex(multicolumnMatcher.group(1)), null));
                continue;
            }

            if (line.contains("&")) {
                String[] columns = line.replaceAll("\\\\\\\\.*$", "").split("&", 2);
                if (columns.length == 2) {
                    blocks.add(new Block(BlockType.ROW, cleanLatex(columns[0]), cleanLatex(columns[1])));
                    continue;
                }
            }

            String clean = cleanLatex(line);
            if (!clean.isBlank() && !isLatexControlOnly(clean)) {
                blocks.add(new Block(BlockType.TEXT, clean, null));
            }
        }

        return blocks;
    }

    private String cleanLatex(String input) {
        String text = input;
        text = text.replaceAll("\\\\Huge\\{([^}]*)}", "$1");
        text = text.replaceAll("\\\\href\\{[^}]*}\\{([^}]*)}", "$1");
        text = replaceOneArgCommand(text, TEXTBF_PATTERN);
        text = text.replaceAll("\\\\normalsize\\{([^}]*)}", "$1");
        text = text.replaceAll("\\\\raisebox\\{[^}]*}\\{?", "");
        text = text.replaceAll("\\\\fa[A-Za-z]+", "");
        text = text.replaceAll("\\\\hfill", "");
        text = text.replaceAll("\\\\\\\\(\\[[^]]*])?", " ");
        text = text.replace("$|$", "|");
        text = text.replace("\\&", "&");
        text = text.replace("\\%", "%");
        text = text.replace("\\$", "$ ");
        text = text.replace("\\#", "#");
        text = text.replace("\\_", "_");
        text = text.replace("{", "").replace("}", "");
        text = text.replaceAll("\\\\[a-zA-Z]+\\*?(\\[[^]]*])?", "");
        text = sanitizeForPdf(text);
        return text.replaceAll("\\s+", " ").trim();
    }

    private String replaceOneArgCommand(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            matcher.appendReplacement(result, Matcher.quoteReplacement(matcher.group(1)));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private String sanitizeForPdf(String input) {
        return Normalizer.normalize(input, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .replace("’", "'")
                .replace("“", "\"")
                .replace("”", "\"")
                .replace("–", "-")
                .replace("—", "-");
    }

    private boolean isLatexControlOnly(String text) {
        return text.startsWith("\\begin") || text.startsWith("\\end") || text.startsWith("\\vfill") || text.startsWith("\\center");
    }

    private enum BlockType {
        HEADER, SECTION, ROW, BULLET, TEXT
    }

    private record Block(BlockType type, String left, String right) {
    }

    private static class Renderer {
        private final PDDocument document;
        private final PDType1Font regularFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        private final PDType1Font boldFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        private PDPage page;
        private PDPageContentStream stream;
        private float y;
        private int headerLineCount;

        private Renderer(PDDocument document) throws IOException {
            this.document = document;
            newPage();
        }

        private void render(Block block) throws IOException {
            switch (block.type()) {
                case HEADER -> renderHeader(block.left());
                case SECTION -> renderSection(block.left());
                case ROW -> renderRow(block.left(), block.right());
                case BULLET -> renderBullet(block.left());
                case TEXT -> renderText(block.left(), FONT_SIZE, regularFont, MARGIN);
            }
        }

        private void renderHeader(String text) throws IOException {
            if (headerLineCount == 0) {
                drawCentered(text, TITLE_FONT_SIZE, boldFont);
                y -= 10;
            } else {
                drawCentered(text, SMALL_FONT_SIZE, regularFont);
            }
            headerLineCount++;
        }

        private void renderSection(String title) throws IOException {
            y -= 8;
            ensureSpace(SECTION_FONT_SIZE + 12);
            drawText(title.toUpperCase(), MARGIN, y, SECTION_FONT_SIZE, boldFont);
            y -= 4;
            stream.moveTo(MARGIN, y);
            stream.lineTo(page.getMediaBox().getWidth() - MARGIN, y);
            stream.stroke();
            y -= 14;
        }

        private void renderRow(String left, String right) throws IOException {
            ensureSpace(LEADING * 2);
            drawText(left, MARGIN, y, FONT_SIZE, boldFont);
            if (right != null && !right.isBlank()) {
                float rightWidth = boldFont.getStringWidth(right) / 1000 * FONT_SIZE;
                drawText(right, page.getMediaBox().getWidth() - MARGIN - rightWidth, y, FONT_SIZE, boldFont);
            }
            y -= LEADING;
        }

        private void renderBullet(String text) throws IOException {
            for (String line : wrap(text, regularFont, SMALL_FONT_SIZE, page.getMediaBox().getWidth() - (2 * MARGIN) - 18)) {
                ensureSpace(LEADING);
                drawText("-", MARGIN + 8, y, SMALL_FONT_SIZE, regularFont);
                drawText(line, MARGIN + 20, y, SMALL_FONT_SIZE, regularFont);
                y -= LEADING;
            }
        }

        private void renderText(String text, float fontSize, PDType1Font font, float x) throws IOException {
            for (String line : wrap(text, font, fontSize, page.getMediaBox().getWidth() - x - MARGIN)) {
                ensureSpace(LEADING);
                drawText(line, x, y, fontSize, font);
                y -= LEADING;
            }
        }

        private void drawCentered(String text, float fontSize, PDType1Font font) throws IOException {
            ensureSpace(fontSize + 6);
            float textWidth = font.getStringWidth(text) / 1000 * fontSize;
            float x = (page.getMediaBox().getWidth() - textWidth) / 2;
            drawText(text, x, y, fontSize, font);
            y -= fontSize + 5;
        }

        private void drawText(String text, float x, float y, float fontSize, PDType1Font font) throws IOException {
            stream.beginText();
            stream.setFont(font, fontSize);
            stream.newLineAtOffset(x, y);
            stream.showText(text);
            stream.endText();
        }

        private List<String> wrap(String text, PDType1Font font, float fontSize, float maxWidth) throws IOException {
            List<String> lines = new ArrayList<>();
            StringBuilder current = new StringBuilder();
            for (String word : text.split("\\s+")) {
                String candidate = current.isEmpty() ? word : current + " " + word;
                float width = font.getStringWidth(candidate) / 1000 * fontSize;
                if (width > maxWidth && !current.isEmpty()) {
                    lines.add(current.toString());
                    current = new StringBuilder(word);
                } else {
                    current = new StringBuilder(candidate);
                }
            }
            if (!current.isEmpty()) {
                lines.add(current.toString());
            }
            return lines;
        }

        private void ensureSpace(float needed) throws IOException {
            if (y - needed < MARGIN) {
                newPage();
            }
        }

        private void newPage() throws IOException {
            if (stream != null) {
                stream.close();
            }
            page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            stream = new PDPageContentStream(document, page);
            y = page.getMediaBox().getHeight() - MARGIN;
        }

        private void close() throws IOException {
            if (stream != null) {
                stream.close();
            }
        }
    }
}
