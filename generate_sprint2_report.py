# -*- coding: utf-8 -*-
"""
Génère CVGen_Rapport_Sprint_S2.pdf avec le même format que Sprint S1.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# ── Polices TrueType Windows pour gérer les tirets demi-cadratins ──────────
FONT_DIR = r"C:\Windows\Fonts"
_fonts_registered = False

def register_fonts():
    global _fonts_registered
    if _fonts_registered:
        return
    try:
        pdfmetrics.registerFont(TTFont('Arial',       os.path.join(FONT_DIR, 'arial.ttf')))
        pdfmetrics.registerFont(TTFont('Arial-Bold',  os.path.join(FONT_DIR, 'arialbd.ttf')))
        pdfmetrics.registerFont(TTFont('Arial-Italic',os.path.join(FONT_DIR, 'ariali.ttf')))
        NORMAL  = 'Arial'
        BOLD    = 'Arial-Bold'
    except Exception:
        NORMAL  = 'Helvetica'
        BOLD    = 'Helvetica-Bold'
    _fonts_registered = True
    return NORMAL, BOLD

NORMAL, BOLD = register_fonts()

# ── Constantes du rapport ──────────────────────────────────────────────────
PAGE_WIDTH, PAGE_HEIGHT = A4
ML, MR, MT, MB = 2*cm, 2*cm, 3*cm, 2*cm
SPRINT      = "S2"
DATES       = "11 \u2013 16 mai 2026"   # en dash
SUBTITLE    = "Extension Chrome & Gestion du Profil"
NEXT_DATES  = "18 \u2013 25 mai 2026"
GREY_HEADER = HexColor('#e8e8e8')
GREY_ALT    = HexColor('#f7f7f7')
GREY_LINE   = HexColor('#aaaaaa')


# ── Canvas numéroté (en-tête sur pages 2+) ────────────────────────────────
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._page_number = 0

    def showPage(self):
        self._page_number += 1
        if self._page_number > 1:
            self._draw_header()
        canvas.Canvas.showPage(self)

    def _draw_header(self):
        self.saveState()
        self.setFont(NORMAL, 8.5)
        y = PAGE_HEIGHT - 1.2*cm
        left_text  = f"CVGen \u2014 Rapport de Sprint {SPRINT}    |   {DATES}"
        right_text = f" Page {self._page_number}  "
        self.drawString(ML, y, left_text)
        self.drawRightString(PAGE_WIDTH - MR, y, right_text)
        self.setLineWidth(0.4)
        self.setStrokeColor(GREY_LINE)
        self.line(ML, y - 3*mm, PAGE_WIDTH - MR, y - 3*mm)
        self.restoreState()


# ── Styles ─────────────────────────────────────────────────────────────────
def S(name, **kw):
    defaults = dict(fontName=NORMAL, fontSize=10, leading=14,
                    spaceAfter=4, alignment=TA_LEFT)
    defaults.update(kw)
    return ParagraphStyle(name, **defaults)

body       = S('body',      leading=14, spaceAfter=6, alignment=TA_JUSTIFY)
h1         = S('h1',        fontName=BOLD, fontSize=13, spaceBefore=14, spaceAfter=6)
h2         = S('h2',        fontName=BOLD, fontSize=11, spaceBefore=10, spaceAfter=4)
th         = S('th',        fontName=BOLD, fontSize=9.5)
tc         = S('tc',        fontSize=9.5, leading=12)
bullet     = S('bullet',    fontSize=10,  leading=14, leftIndent=12, spaceAfter=3)
cover_big  = S('cvr_big',   fontName=BOLD, fontSize=32, alignment=TA_CENTER, spaceAfter=4)
cover_sub  = S('cvr_sub',   fontSize=12,  alignment=TA_CENTER, textColor=HexColor('#444'), spaceAfter=20)
cover_sp   = S('cvr_sp',    fontName=BOLD, fontSize=20, alignment=TA_CENTER, spaceAfter=6)
cover_spsu = S('cvr_spsu',  fontSize=14,  alignment=TA_CENTER, textColor=HexColor('#333'), spaceAfter=4)
cover_date = S('cvr_date',  fontName=BOLD, fontSize=12, alignment=TA_CENTER, spaceAfter=4)
small_bold = S('sm_bold',   fontName=BOLD, fontSize=9.5, spaceAfter=10)
next_rpt   = S('next_rpt',  fontName=BOLD, fontSize=10)


# ── Table helper ──────────────────────────────────────────────────────────
def tbl(data, widths):
    """Crée une table stylée identique au Sprint S1."""
    rows = []
    for i, row in enumerate(data):
        rows.append([Paragraph(str(c), th if i == 0 else tc) for c in row])
    t = Table(rows, colWidths=widths)
    t.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0),  GREY_HEADER),
        ('FONTNAME',     (0,0), (-1,0),  BOLD),
        ('FONTSIZE',     (0,0), (-1,-1), 9.5),
        ('GRID',         (0,0), (-1,-1), 0.5, GREY_LINE),
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('LEFTPADDING',  (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS',(0,1),(-1,-1), [colors.white, GREY_ALT]),
    ]))
    return t


# ── Construction du document ──────────────────────────────────────────────
def build():
    out = r"C:\Users\rania\OneDrive\Desktop\Master 1IM\Projet Mulhouse\Cvgen\CVGen_Rapport_Sprint_S2.pdf"
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
        title=f"CVGen \u2014 Rapport de Sprint {SPRINT}",
        author="Rania MAMOU, Zakariae ABDOUNI",
    )

    W = PAGE_WIDTH - ML - MR   # largeur utile
    story = []

    # ══════════════════════════════════════════════════════════════
    # PAGE 1 — Couverture
    # ══════════════════════════════════════════════════════════════
    story += [
        Spacer(1, 3*cm),
        Paragraph("CVGen", cover_big),
        Paragraph("Plateforme SaaS de g\u00e9n\u00e9ration intelligente de CV", cover_sub),
        Spacer(1, 1.5*cm),
        Paragraph(f"RAPPORT DE SPRINT {SPRINT}", cover_sp),
        Paragraph(SUBTITLE, cover_spsu),
        Paragraph(DATES, cover_date),
        Spacer(1, 3*cm),
    ]

    # Tableau équipe (layout identique S1)
    cov_team = Table(
        [[Paragraph("R\u00e9alis\u00e9 par :", S('x', fontName=BOLD, fontSize=11)),
          Paragraph("Zakariae ABDOUNI<br/>Rania MAMOU",
                    S('y', fontSize=11, leading=16))]],
        colWidths=[5*cm, W-5*cm]
    )
    cov_team.setStyle(TableStyle([
        ('VALIGN', (0,0),(-1,-1),'TOP'),
        ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
    ]))
    story.append(cov_team)
    story.append(Spacer(1, 0.5*cm))

    cov_info = Table(
        [[Paragraph("Fili\u00e8re :", S('fa', fontName=BOLD, fontSize=11)),
          Paragraph("Informatique et mobilit\u00e9", S('fb', fontSize=11)),
          Paragraph("Encadr\u00e9 par :", S('ea', fontName=BOLD, fontSize=11)),
          Paragraph("M. Frederic Cordier", S('eb', fontSize=11))]],
        colWidths=[3*cm, 5.5*cm, 3.5*cm, W-12*cm]
    )
    cov_info.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),2),
    ]))
    story.append(cov_info)
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("Ann\u00e9e Universitaire:  2025 \u2013 2026",
                            S('ay', fontName=BOLD, fontSize=11)))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════
    # PAGE 2 — Introduction + Architecture
    # ══════════════════════════════════════════════════════════════
    story += [
        Spacer(1, 0.5*cm),
        Paragraph("1. Introduction", h1),
        Paragraph(
            "CVGen est une plateforme SaaS francophone qui r\u00e9pond \u00e0 un probl\u00e8me concret : "
            "la grande majorit\u00e9 des candidats ne personnalisent pas leurs CV et lettres de "
            "motivation, faute d\u2019outils adapt\u00e9s au march\u00e9 fran\u00e7ais. Contrairement "
            "aux solutions existantes \u2014 Kickresume, Rezi, Teal HQ \u2014 quasi exclusivement "
            "en anglais, CVGen permet de centraliser son profil professionnel une seule fois, puis de "
            "g\u00e9n\u00e9rer automatiquement pour chaque offre un CV personnalis\u00e9 et une "
            "lettre de motivation optimis\u00e9s pour les ATS utilis\u00e9s par les recruteurs "
            "fran\u00e7ais, export\u00e9s en PDF via LaTeX.",
            body),
        Spacer(1, 0.2*cm),
        Paragraph(
            f"Ce rapport couvre le sprint S2 \u2014 {SUBTITLE} \u2014 r\u00e9alis\u00e9 du {DATES}. "
            "Il pr\u00e9sente les travaux accomplis par l\u2019\u00e9quipe, les technologies mises "
            f"en place, ainsi que la roadmap de la semaine suivante ({NEXT_DATES}).",
            body),
        Spacer(1, 0.4*cm),
        Paragraph("1.1 \u00c9quipe", h2),
        tbl(
            [["Membre", "P\u00e9rim\u00e8tre S2"],
             ["Zakariae Abdouni", "Module Profil + Site Web (Dashboard & Pages Profil)"],
             ["Rania", "Extension Chrome \u2014 Fondations & Remplissage de base"]],
            [6*cm, W-6*cm]
        ),
        Spacer(1, 0.8*cm),
        Paragraph("2. Architecture technique retenue", h1),
        Paragraph(
            "L\u2019architecture d\u00e9finie lors du Sprint S1 est conserv\u00e9e : monolithe "
            "modulaire c\u00f4t\u00e9 backend (Spring Boot 3.2 / Java 17) avec architecture "
            "hexagonale sur les modules critiques (generation, ats), et frontend React\u00a018 / "
            "TypeScript avec Zustand. L\u2019extension Chrome adopte une architecture Manifest V3 "
            "avec s\u00e9paration stricte service worker / content scripts / popup, conform\u00e9ment "
            "aux exigences de s\u00e9curit\u00e9 de la plateforme Chrome Extension.",
            body),
        Spacer(1, 0.3*cm),
        Paragraph(
            "Architecture :  Monolithe Modulaire + Architecture Hexagonale (backend) + "
            "Manifest V3 (extension Chrome)",
            S('archi', fontName=BOLD, fontSize=10, spaceAfter=8)),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════════════
    # PAGE 3 — Travaux réalisés
    # ══════════════════════════════════════════════════════════════
    story += [
        Spacer(1, 0.5*cm),
        Paragraph(f"3. Semaine 2 \u2014 Travaux r\u00e9alis\u00e9s ({DATES})", h1),
        Paragraph(
            "Le sprint S2 couvre deux axes parall\u00e8les : Zakariae d\u00e9veloppe le module "
            "de gestion du profil utilisateur (backend + frontend), tandis que Rania pose les "
            "fondations de l\u2019extension Chrome avec la d\u00e9tection et le remplissage "
            "automatique des champs basiques sur les plateformes d\u2019emploi fran\u00e7aises.",
            body),
        Spacer(1, 0.3*cm),
        Paragraph("3.1 Extension Chrome \u2014 Manifest V3 & Remplissage (Rania)", h2),
        tbl(
            [["T\u00e2che", "D\u00e9tails", "Assign\u00e9"],
             ["Structure Manifest V3",
              "manifest.json MV3, service-worker.js, popup.html / popup.js, "
              "architecture des r\u00e9pertoires (content/, utils/, popup/), "
              "permissions minimales",
              "Rania"],
             ["Connexion compte CVGen",
              "Login depuis l\u2019extension, JWT stock\u00e9 dans chrome.storage.local, "
              "communication service worker \u2194 popup via chrome.runtime.sendMessage "
              "(LOGIN, GET_PROFILE, GET_CACHED_PROFILE)",
              "Rania"],
             ["D\u00e9tection de champs",
              "field-detector.js : FIELD_MAPPINGS avec 12 types (nom, pr\u00e9nom, email, "
              "t\u00e9l\u00e9phone, adresse, ville, code postal, pays, titre, description, "
              "lettre, lien) \u2014 d\u00e9tection sur 7 sources HTML (label, placeholder, "
              "name, id, aria-label, title, parent)",
              "Rania"],
             ["Remplissage auto \u2014 champs basiques",
              "field-filler.js : fillInputField, fillTextareaField, fillSelectField "
              "avec d\u00e9clenchement des \u00e9v\u00e9nements natifs (input, change, blur) "
              "\u2014 test\u00e9 et valid\u00e9 sur Indeed\u00a0FR",
              "Rania"]],
            [4.5*cm, 9*cm, 3*cm]
        ),
        Spacer(1, 0.5*cm),
        Paragraph("3.2 Site Web \u2014 Module Profil & Dashboard (Zakariae)", h2),
        tbl(
            [["T\u00e2che", "D\u00e9tails", "Assign\u00e9"],
             ["Entit\u00e9s Profil + Migrations",
              "UserProfile, Experience, Education, Skill, Language \u2014 "
              "relations JPA OneToMany, migrations V3 \u00e0 V5, UUID comme PK",
              "Zakariae"],
             ["API CRUD Profil complet",
              "Endpoints GET / PUT / POST / DELETE pour chaque section du profil, "
              "DTOs, Bean Validation, tests unitaires",
              "Zakariae"],
             ["Dashboard Frontend",
              "Page dashboard : statistiques de compl\u00e9tion du profil, acc\u00e8s "
              "rapide aux sections, connexion \u00e0 l\u2019API backend via Axios",
              "Zakariae"],
             ["Pages Profil",
              "Formulaires d\u2019\u00e9dition : exp\u00e9riences, formations, "
              "comp\u00e9tences, langues \u2014 Zustand store mis \u00e0 jour, "
              "int\u00e9gration des maquettes S1",
              "Zakariae"]],
            [4.5*cm, 9*cm, 3*cm]
        ),
        PageBreak(),
    ]

    # ══════════════════════════════════════════════════════════════
    # PAGE 4 — Technologies + Livrables
    # ══════════════════════════════════════════════════════════════
    story += [
        Spacer(1, 0.5*cm),
        Paragraph("4. Technologies utilis\u00e9es cette semaine", h1),
    ]

    tech_data = [
        ["Java 17 / Spring Boot 3.2",  "PostgreSQL 16",                  "React 18 / TypeScript"],
        ["Tailwind CSS / Vite",         "Chrome Extension MV3",           "JWT / chrome.storage.local"],
        ["Flyway (migrations)",         "MapStruct / Bean Validation",    "Zustand (state)"],
        ["Zod / react-hook-form",       "Axios",                          "JavaScript (Vanilla \u2014 content scripts)"],
    ]
    tech_tbl = Table(tech_data, colWidths=[W/3]*3)
    tech_tbl.setStyle(TableStyle([
        ('FONTNAME',      (0,0),(-1,-1), NORMAL),
        ('FONTSIZE',      (0,0),(-1,-1), 9.5),
        ('GRID',          (0,0),(-1,-1), 0.5, GREY_LINE),
        ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
        ('TOPPADDING',    (0,0),(-1,-1), 5),
        ('BOTTOMPADDING', (0,0),(-1,-1), 5),
        ('LEFTPADDING',   (0,0),(-1,-1), 6),
        ('ROWBACKGROUNDS',(0,0),(-1,-1), [GREY_ALT, colors.white]),
    ]))
    story.append(tech_tbl)

    story += [
        Spacer(1, 0.8*cm),
        Paragraph("5. Livrables du sprint S2", h1),
        Paragraph(
            "Crit\u00e8res de compl\u00e9tion : Extension Chrome fonctionnelle (login + "
            "d\u00e9tection + remplissage Indeed)\u00a0 \u00b7 \u00a0 "
            "Dashboard connect\u00e9 au backend\u00a0 \u00b7 \u00a0 "
            "API profil CRUD op\u00e9rationnelle",
            small_bold),
    ]
    for item in [
        "Extension Chrome Manifest V3 : structure compl\u00e8te, connexion au compte CVGen, "
        "login JWT depuis le popup",
        "field-detector.js op\u00e9rationnel : d\u00e9tection de 12 types de champs sur 7 "
        "sources HTML (label, placeholder, name, id, aria-label, title, parent)",
        "Remplissage automatique des champs basiques valid\u00e9 sur Indeed\u00a0FR "
        "(nom, pr\u00e9nom, email, t\u00e9l\u00e9phone, adresse)",
        "Module Profil backend avec API CRUD compl\u00e8te (GET/PUT/POST/DELETE) pour "
        "chaque section",
        "Dashboard frontend connect\u00e9 \u00e0 l\u2019API profil avec statistiques de "
        "compl\u00e9tion",
        "Pages d\u2019\u00e9dition du profil : exp\u00e9riences, formations, "
        "comp\u00e9tences, langues",
    ]:
        story.append(Paragraph(f"\u2022 {item}", bullet))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════
    # PAGE 5 — Roadmap S3 + Conclusion
    # ══════════════════════════════════════════════════════════════
    story += [
        Spacer(1, 0.5*cm),
        Paragraph(f"6. Semaine 3 \u2014 Roadmap ({NEXT_DATES})", h1),
        Paragraph(
            "La semaine 3 correspond au sprint S3 pour Zakariae (import de CV et g\u00e9n\u00e9ration "
            "automatique) et \u00e0 la continuation du sprint extension Chrome pour Rania, avec le "
            "support des portails d\u2019entreprise avanc\u00e9s (SuccessFactors, Workday, Taleo).",
            body),
        Spacer(1, 0.4*cm),
        Paragraph("6.1 Zakariae \u2014 Import CV et G\u00e9n\u00e9ration (S3)", h2),
        tbl(
            [["T\u00e2che", "D\u00e9tails", "Assign\u00e9"],
             ["Import CV PDF/Word",
              "Apache PDFBox + Apache POI, extraction automatique des donn\u00e9es "
              "vers le profil",
              "Zakariae"],
             ["Module G\u00e9n\u00e9ration CV",
              "Int\u00e9gration IA/LaTeX pour g\u00e9n\u00e9ration de CV personnalis\u00e9 "
              "par offre, templates LaTeX",
              "Zakariae"],
             ["Scoring ATS",
              "Analyse de correspondance offre/profil, score ATS, suggestions "
              "d\u2019optimisation",
              "Zakariae"]],
            [4.5*cm, 9*cm, 3*cm]
        ),
        Spacer(1, 0.5*cm),
        Paragraph(
            "6.2 Rania \u2014 Extension Chrome avanc\u00e9e (support portails entreprise)", h2),
        tbl(
            [["T\u00e2che", "D\u00e9tails", "Assign\u00e9"],
             ["Support SuccessFactors",
              "D\u00e9tection des accord\u00e9ons, custom selects, dates JJ/MM/AAAA, "
              "remplissage des champs avanc\u00e9s (Capgemini, portail SAP)",
              "Rania"],
             ["Sections dynamiques",
              "Clic automatique sur les boutons \u00ab\u00a0Ajouter\u00a0\u00bb, "
              "remplissage des sous-formulaires exp\u00e9riences/formations",
              "Rania"],
             ["Support multi-portails",
              "Workday, Taleo, SmartRecruiters \u2014 permissions manifest, "
              "d\u00e9tection contextuelle des portails",
              "Rania"]],
            [4.5*cm, 9*cm, 3*cm]
        ),
        Spacer(1, 0.8*cm),
        Paragraph("7. Conclusion", h1),
        Paragraph(
            "Le sprint S2 est en bonne voie. Rania a pos\u00e9 les fondations de l\u2019extension "
            "Chrome : la structure Manifest V3 est en place, la connexion au compte CVGen est "
            "op\u00e9rationnelle depuis le popup, et le remplissage automatique des champs basiques "
            "a \u00e9t\u00e9 test\u00e9 et valid\u00e9 sur Indeed\u00a0FR. L\u2019architecture "
            "content script / service worker est stable et pr\u00eate pour l\u2019ajout de "
            "portails suppl\u00e9mentaires.",
            body),
        Spacer(1, 0.3*cm),
        Paragraph(
            "Zakariae a avanc\u00e9 significativement sur le module profil : l\u2019API CRUD est "
            "op\u00e9rationnelle, le dashboard frontend est connect\u00e9 au backend, et les pages "
            "d\u2019\u00e9dition du profil sont en cours d\u2019int\u00e9gration. Le point de "
            "vigilance pour la semaine 3 est la finalisation de l\u2019import CV (PDF/Word), "
            "pr\u00e9requis pour la g\u00e9n\u00e9ration automatique.",
            body),
        Spacer(1, 0.3*cm),
        Paragraph(
            "La progression parall\u00e8le des deux axes (extension Chrome et g\u00e9n\u00e9ration "
            "IA) est strat\u00e9gique : l\u2019extension sera utilisable par les candidats d\u00e8s "
            "la fin du sprint S3, en compl\u00e9ment de la plateforme web.",
            body),
        Spacer(1, 0.5*cm),
        Paragraph(
            "Prochain rapport : Sprint S3 \u2014 G\u00e9n\u00e9ration de CV & Extension "
            "avanc\u00e9e \u2014 Semaine du 18 mai 2026",
            next_rpt),
    ]

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF g\u00e9n\u00e9r\u00e9 : {out}")


if __name__ == "__main__":
    build()
