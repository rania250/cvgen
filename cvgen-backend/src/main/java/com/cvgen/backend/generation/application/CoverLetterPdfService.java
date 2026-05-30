package com.cvgen.backend.generation.application;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.auth.infrastructure.persistence.entity.UserEntity;
import com.cvgen.backend.generation.application.exception.PdfCompilationException;
import com.cvgen.backend.profile.api.dto.UserProfileDto;
import com.cvgen.backend.profile.application.ProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Génère un PDF simple et propre à partir du texte d'une lettre de motivation,
 * en utilisant PDFBox (aucune dépendance LaTeX externe requise).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoverLetterPdfService {

    private static final float MARGIN = 56;          // ~2 cm
    private static final float FONT_SIZE = 11;
    private static final float LEADING = 16;
    private static final float HEADER_FONT_SIZE = 16;

    private final ProfileService profileService;
    private final UserJpaRepository userRepository;

    public byte[] generatePdf(UUID userId, String letterText) {
        UserEntity user = userRepository.findById(userId).orElse(null);
        UserProfileDto profile = null;
        try {
            profile = profileService.getUserProfile(userId);
        } catch (RuntimeException e) {
            log.warn("Profil indisponible pour l'en-tête de lettre : {}", e.getMessage());
        }

        String fullName = user != null
                ? (nz(user.getFirstName()) + " " + nz(user.getLastName())).trim()
                : "";
        String email = user != null ? nz(user.getEmail()) : "";
        String phone = profile != null ? nz(profile.phone()) : "";
        String location = profile != null ? nz(profile.location()) : "";

        try (PDDocument doc = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            PDFont fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDFont fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            float width = page.getMediaBox().getWidth();
            float usableWidth = width - 2 * MARGIN;

            PDPageContentStream cs = new PDPageContentStream(doc, page);
            float y = page.getMediaBox().getHeight() - MARGIN;

            // En-tête : nom + contact
            if (!fullName.isBlank()) {
                cs.beginText();
                cs.setFont(fontBold, HEADER_FONT_SIZE);
                cs.newLineAtOffset(MARGIN, y);
                cs.showText(sanitize(fullName));
                cs.endText();
                y -= LEADING + 6;
            }

            String contactLine = joinNonBlank(" • ", email, phone, location);
            if (!contactLine.isBlank()) {
                cs.beginText();
                cs.setFont(fontRegular, 9);
                cs.newLineAtOffset(MARGIN, y);
                cs.showText(sanitize(contactLine));
                cs.endText();
                y -= LEADING;
            }

            // Date alignée à droite
            String dateStr = LocalDate.now()
                    .format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRENCH));
            cs.beginText();
            cs.setFont(fontRegular, FONT_SIZE);
            float dateWidth = fontRegular.getStringWidth(sanitize(dateStr)) / 1000 * FONT_SIZE;
            cs.newLineAtOffset(width - MARGIN - dateWidth, y);
            cs.showText(sanitize(dateStr));
            cs.endText();
            y -= LEADING * 2;

            // Corps de la lettre
            cs.setFont(fontRegular, FONT_SIZE);
            String body = letterText == null ? "" : letterText.replace("\r\n", "\n").replace("\r", "\n");

            for (String paragraph : body.split("\n")) {
                if (paragraph.isBlank()) {
                    y -= LEADING;
                    if (y < MARGIN) {
                        cs.close();
                        PageCursor pc = newPage(doc);
                        cs = pc.cs;
                        cs.setFont(fontRegular, FONT_SIZE);
                        y = pc.y;
                    }
                    continue;
                }
                List<String> lines = wrap(paragraph.trim(), fontRegular, FONT_SIZE, usableWidth);
                for (String line : lines) {
                    if (y < MARGIN) {
                        cs.close();
                        PageCursor pc = newPage(doc);
                        cs = pc.cs;
                        cs.setFont(fontRegular, FONT_SIZE);
                        y = pc.y;
                    }
                    cs.beginText();
                    cs.newLineAtOffset(MARGIN, y);
                    cs.showText(sanitize(line));
                    cs.endText();
                    y -= LEADING;
                }
                y -= LEADING * 0.4f;
            }

            cs.close();
            doc.save(out);
            byte[] pdf = out.toByteArray();
            log.info("PDF lettre de motivation généré : {} octets", pdf.length);
            return pdf;
        } catch (IOException e) {
            log.error("Erreur génération PDF lettre de motivation", e);
            throw new PdfCompilationException("Erreur lors de la génération du PDF de la lettre", e);
        }
    }

    private PageCursor newPage(PDDocument doc) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        PDPageContentStream cs = new PDPageContentStream(doc, page);
        return new PageCursor(cs, page.getMediaBox().getHeight() - MARGIN);
    }

    /** Découpe un paragraphe en lignes qui tiennent dans la largeur utile. */
    private List<String> wrap(String text, PDFont font, float fontSize, float maxWidth) throws IOException {
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String word : text.split("\\s+")) {
            String candidate = current.length() == 0 ? word : current + " " + word;
            float w = font.getStringWidth(sanitize(candidate)) / 1000 * fontSize;
            if (w > maxWidth && current.length() > 0) {
                lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                current = new StringBuilder(candidate);
            }
        }
        if (current.length() > 0) lines.add(current.toString());
        return lines;
    }

    /**
     * Les polices Standard14 ne supportent que WinAnsi. On translittère les
     * caractères problématiques pour éviter les exceptions d'encodage.
     */
    private String sanitize(String s) {
        if (s == null) return "";
        return s
                .replace('\u2019', '\'')   // ’
                .replace('\u2018', '\'')
                .replace('\u201C', '"')    // “
                .replace('\u201D', '"')
                .replace('\u2013', '-')    // –
                .replace('\u2014', '-')    // —
                .replace('\u2026', '.')
                .replace('\u00A0', ' ');   // espace insécable
    }

    private String nz(String s) {
        return s == null ? "" : s;
    }

    private String joinNonBlank(String sep, String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p != null && !p.isBlank()) {
                if (sb.length() > 0) sb.append(sep);
                sb.append(p);
            }
        }
        return sb.toString();
    }

    /** Petit conteneur (stream + position Y) pour la pagination. */
    private static final class PageCursor {
        final PDPageContentStream cs;
        final float y;
        PageCursor(PDPageContentStream cs, float y) {
            this.cs = cs;
            this.y = y;
        }
    }
}
