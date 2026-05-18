package com.cvgen.backend.profile.application;

import com.cvgen.backend.profile.api.dto.ParsedCvDto;
import com.cvgen.backend.shared.exception.FileProcessingException;
import com.cvgen.backend.shared.exception.UnsupportedFileTypeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

/**
 * Service d'extraction de texte brut depuis un fichier CV uploadé.
 *
 * <p>Formats supportés :
 * <ul>
 *   <li>{@code application/pdf}  → PDFBox</li>
 *   <li>{@code application/vnd.openxmlformats-officedocument.wordprocessingml.document}
 *       (.docx) → Apache POI</li>
 * </ul>
 * Limite : 10 Mo par fichier (sinon {@link FileProcessingException}).
 *
 * <p>NOTE : l'analyse IA du texte extrait sera ajoutée dans un sprint ultérieur.
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class CvImportService {

    /** 10 Mo en octets. */
    public static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;

    private static final String CONTENT_TYPE_PDF = "application/pdf";
    private static final String CONTENT_TYPE_DOCX =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final CvParserService cvParserService;

    // =====================================================
    // Dispatcher par content-type
    // =====================================================

    /**
     * Extrait le texte du fichier et le parse intelligemment en sections structurées.
     *
     * @param file le fichier CV (PDF ou DOCX)
     * @return ParsedCvDto contenant toutes les sections détectées
     * @throws FileProcessingException si le fichier est vide, trop volumineux ou illisible
     * @throws UnsupportedFileTypeException si le format n'est ni PDF ni DOCX
     */
    public ParsedCvDto extractAndParse(MultipartFile file) {
        String rawText = extractTextFromFile(file);
        log.info("Texte extrait ({} caractères), début du parsing IA...", rawText.length());
        ParsedCvDto result = cvParserService.parseCv(rawText);
        log.info("Parsing IA terminé : {} expériences, {} formations, {} compétences, {} langues, {} certifications, {} projets",
                result.getExperiences().size(),
                result.getEducations().size(),
                result.getSkills().size(),
                result.getLanguages().size(),
                result.getCertifications().size(),
                result.getProjects() != null ? result.getProjects().size() : 0);
        return result;
    }

    /**
     * Extrait le texte brut du fichier selon son content-type.
     *
     * @throws UnsupportedFileTypeException si le format n'est ni PDF ni DOCX
     * @throws FileProcessingException      si le fichier est vide, trop volumineux ou illisible
     */
    public String extractTextFromFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FileProcessingException("Le fichier est vide ou absent");
        }
        validateSize(file);

        String contentType = file.getContentType();
        if (CONTENT_TYPE_PDF.equalsIgnoreCase(contentType)) {
            return extractTextFromPdf(file);
        }
        if (CONTENT_TYPE_DOCX.equalsIgnoreCase(contentType)) {
            return extractTextFromDocx(file);
        }
        throw new UnsupportedFileTypeException(
                "Format de fichier non supporté : " + contentType
                        + ". Formats acceptés : PDF, DOCX.");
    }

    // =====================================================
    // PDF — PDFBox
    // =====================================================

    public String extractTextFromPdf(MultipartFile file) {
        validateSize(file);
        try (InputStream is = file.getInputStream();
             PDDocument document = Loader.loadPDF(is.readAllBytes())) {

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);
            return text == null ? "" : text.trim();

        } catch (IOException ex) {
            log.warn("Impossible de lire le PDF '{}' : {}", file.getOriginalFilename(), ex.getMessage());
            throw new FileProcessingException(
                    "Impossible de lire le fichier PDF (corrompu ou protégé).", ex);
        }
    }

    // =====================================================
    // DOCX — Apache POI
    // =====================================================

    public String extractTextFromDocx(MultipartFile file) {
        validateSize(file);
        try (InputStream is = file.getInputStream();
             XWPFDocument document = new XWPFDocument(is)) {

            StringBuilder sb = new StringBuilder();

            // 1) Paragraphes principaux du document
            for (XWPFParagraph p : document.getParagraphs()) {
                String text = p.getText();
                if (text != null && !text.isBlank()) {
                    sb.append(text).append('\n');
                }
            }

            // 2) Tableaux (CV en colonnes : compétences, expériences en grille…)
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    StringBuilder rowText = new StringBuilder();
                    for (XWPFTableCell cell : row.getTableCells()) {
                        String cellText = cell.getText();
                        if (cellText != null && !cellText.isBlank()) {
                            if (rowText.length() > 0) rowText.append(" | ");
                            rowText.append(cellText.trim());
                        }
                    }
                    if (rowText.length() > 0) {
                        sb.append(rowText).append('\n');
                    }
                }
            }

            return sb.toString().trim();

        } catch (IOException ex) {
            log.warn("Impossible de lire le DOCX '{}' : {}", file.getOriginalFilename(), ex.getMessage());
            throw new FileProcessingException(
                    "Impossible de lire le fichier DOCX (corrompu ou format invalide).", ex);
        }
    }

    // =====================================================
    // Helpers
    // =====================================================

    private void validateSize(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileProcessingException(
                    "Le fichier dépasse la taille maximale autorisée (10 Mo).");
        }
    }
}
