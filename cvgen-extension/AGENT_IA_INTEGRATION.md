# Agent IA — Auto-postulation intégré à l'extension CVGen

> Document d'architecture et plan d'intégration
> Cible : intégrer dans l'extension Chrome CVGen un agent IA qui **analyse une offre**, **adapte le profil**, puis **déclenche automatiquement le remplissage et la soumission** du formulaire.
> Statut : proposition technique — non implémentée
> Auteur : équipe Autofill — Mai 2026

---

## Sommaire

1. [Vision et cas d'usage](#1-vision-et-cas-dusage)
2. [Architecture cible](#2-architecture-cible)
3. [Pipeline d'inférence](#3-pipeline-dinférence)
4. [Modifications dans l'extension](#4-modifications-dans-lextension)
5. [Modifications dans le backend CVGen](#5-modifications-dans-le-backend-cvgen)
6. [Choix de modèles LLM](#6-choix-de-modèles-llm)
7. [Roadmap d'implémentation (4 sprints)](#7-roadmap-dimplémentation-4-sprints)
8. [Considérations éthiques, légales et de sécurité](#8-considérations-éthiques-légales-et-de-sécurité)
9. [Estimation budgétaire](#9-estimation-budgétaire)
10. [Risques et mitigations](#10-risques-et-mitigations)
11. [Annexes — exemples de prompts et payloads](#11-annexes--exemples-de-prompts-et-payloads)

---

## 1. Vision et cas d'usage

### 1.1 Pitch

> *"L'utilisateur arrive sur une page d'offre. Il clique sur l'icône CVGen. L'agent IA lit l'annonce, sélectionne les expériences et compétences les plus pertinentes de son profil, rédige une lettre de motivation sur mesure, remplit le formulaire ATS et — sur validation finale ou en mode autonome — soumet la candidature."*

### 1.2 User stories

| ID | En tant que… | Je veux… | Afin de… |
|----|-------------|---------|---------|
| US-1 | Candidat | Que l'extension analyse l'offre que je consulte | Comprendre instantanément l'adéquation |
| US-2 | Candidat | Que l'extension reformule mon profil en fonction de l'annonce | Maximiser mes chances d'être retenu |
| US-3 | Candidat | Que l'extension génère une lettre adaptée | Économiser 15 min par candidature |
| US-4 | Candidat | Voir une **prévisualisation** avant envoi | Garder le contrôle |
| US-5 | Power user | Lancer une postulation **autonome** sur une liste d'offres | Postuler en masse sur des annonces ciblées |
| US-6 | Recruteur (côté CVGen) | Tracer toutes les soumissions IA-assistées | Auditabilité et reporting |

### 1.3 Modes d'exécution

- **Assisté** (par défaut) — l'IA prépare tout, l'utilisateur revoit et clique "Envoyer".
- **Semi-autonome** — l'IA remplit et clique "Suivant" à chaque étape, demande confirmation à la dernière.
- **Autonome** — l'IA va jusqu'à la soumission. Réservé aux profils premium, sous opt-in explicite et fortement encadré juridiquement (cf. §8).

---

## 2. Architecture cible

```
┌──────────────────────────────────────────────────────────────────────┐
│  CHROME EXTENSION (front)                                            │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────────┐  │
│  │   POPUP UI   │  │ SERVICE WORKER │  │   CONTENT SCRIPTS        │  │
│  │              │  │                │  │ ┌──────────────────────┐ │  │
│  │ btn-apply-ai │──▶  ai-client.js  │◀─┤ │ offer-extractor.js   │ │  │
│  │              │  │                │  │ │ field-detector       │ │  │
│  │ preview-ai   │◀─┤ message types  │  │ │ field-filler         │ │  │
│  │ confirm/skip │  │ AI_ANALYZE     │  │ │ submit-handler.js[N] │ │  │
│  └──────────────┘  │ AI_FILL        │  │ └──────────────────────┘ │  │
│                    │ AI_SUBMIT      │  └──────────────────────────┘  │
│                    └────────┬───────┘                                │
└─────────────────────────────┼────────────────────────────────────────┘
                              │ HTTPS + JWT
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  CVGEN BACKEND (existing Spring Boot)                                │
│                                                                      │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │ /api/profile/... │  │ /api/ai/...    │  │ /api/applications/.. │  │
│  │ (existing)       │  │ (NEW)          │  │ (NEW for tracking)   │  │
│  └──────────────────┘  │                │  └──────────────────────┘  │
│                        │  - analyze     │                            │
│                        │  - adapt       │                            │
│                        │  - cover-letter│                            │
│                        │  - decide      │                            │
│                        └────────┬───────┘                            │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │
                                  ▼
                ┌────────────────────────────────────┐
                │  LLM PROVIDER (OpenAI / Mistral /  │
                │  Claude / self-hosted Llama)       │
                └────────────────────────────────────┘
```

### 2.1 Pourquoi le LLM est appelé côté backend

Trois raisons cruciales :

1. **Secret de la clé API LLM** — la stocker dans l'extension serait extraite en 30 secondes.
2. **Caching et rate limiting** — un appel pour un même `(profileHash, offerHash)` peut être servi du cache, économies massives.
3. **Audit, abus, modération** — toute requête transite par un point central que l'équipe CVGen peut superviser.

### 2.2 Pourquoi un module front est tout de même nécessaire

- L'**extraction** de l'offre depuis la page (DOM) reste côté extension (le backend ne voit pas la page).
- Le **remplissage** du formulaire s'appuie sur la pipeline existante (`field-detector` + `field-filler`).
- La **soumission** (clic sur le bouton "Submit") doit se faire dans la page → content script obligatoire.

---

## 3. Pipeline d'inférence

### 3.1 Vue d'ensemble (4 étapes)

```
[ Page ATS ouverte ]
        │
        ▼
┌────────────────┐    EXTRACT_OFFER     ┌──────────────────┐
│  Content       │ ───────────────────▶ │  Popup           │
│  script        │   { title, company,  │  "Analyser       │
│  OfferExtractor│     offerText }      │   cette offre"   │
└────────────────┘                      └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  AI_ANALYZE      │
                                        │  → backend /api  │
                                        │      /ai/analyze │
                                        └────────┬─────────┘
                                                 │
                                                 ▼   match score, skills gap,
                                                     suggested adaptations
                                        ┌──────────────────┐
                                        │  AI_ADAPT_PROFILE│ ←─ user clicks
                                        │  → /ai/adapt     │   "Adapter & remplir"
                                        └────────┬─────────┘
                                                 │
                                                 ▼   adapted_profile (JSON),
                                                     cover_letter (txt)
                                        ┌──────────────────┐
                                        │  AI_FILL         │ ←─ uses standard
                                        │  → handleFillForm│   handleFillForm
                                        │  avec profile    │   with adapted data
                                        │  adapté          │
                                        └────────┬─────────┘
                                                 │
                                                 ▼   form filled
                                        ┌──────────────────┐
                                        │  AI_SUBMIT       │ ←─ if user
                                        │  → clickSubmit   │   confirms or
                                        │  (per site)      │   autonomous mode
                                        └──────────────────┘
```

### 3.2 Détail des étapes

#### Étape A — Extraction (existant, à enrichir)

Le module `offer-extractor.js` existe déjà :

```161:167:cvgen-extension/content/offer-extractor.js
  function extract() {
    return {
      title: extractTitle(),
      company: extractCompany(),
      offerText: extractOfferText()
    };
  }
```

À enrichir pour également capturer :
- L'**URL canonique** de l'offre (sans tracking params)
- La **localisation** (Paris, Remote, etc.)
- Le **type de contrat** (CDI, stage, freelance) si présent dans la page

#### Étape B — Analyse (nouvelle)

Le backend reçoit `{ profile, offer }` et appelle le LLM pour produire un **rapport d'analyse** :

```json
{
  "score": 78,
  "fit": "Profil très adapté — expertise React et Node fortement alignée",
  "gaps": ["Pas d'expérience Kubernetes", "Niveau d'anglais demandé inconnu côté profil"],
  "strengths": ["3 ans React", "2 startups", "Certification AWS"],
  "topRelevantExperiences": ["exp-id-3", "exp-id-1"],
  "suggestedKeywords": ["React", "TypeScript", "Microservices"],
  "suggestedAdjustments": {
    "titrePoste": "Développeur Frontend React Senior",
    "resumeProfessionnel": "Reformuler en mettant en avant React et la scalabilité…"
  }
}
```

#### Étape C — Adaptation (nouvelle)

L'utilisateur valide les suggestions, puis le backend renvoie un **profil adapté** (`profile-adapted.json`) :

- Réordonne les expériences pertinentes en premier.
- Reformule `titrePoste` et `resumeProfessionnel`.
- Génère une **lettre de motivation** spécifique (`coverLetter`).
- Réordonne `competences` pour mettre les pertinentes en tête.

Le profil **brut** n'est jamais modifié — c'est une vue dérivée pour cette candidature.

#### Étape D — Remplissage

Réutilisation totale du pipeline existant `handleFillForm(profil_adapté, lettre_adaptée)`. Aucun changement requis côté `field-detector`/`field-filler`.

#### Étape E — Soumission (nouvelle, par site)

Un module `submit-handler.js` détecte le bouton "Soumettre/Submit/Send Application" pour chaque ATS supporté et exécute la séquence de clic. Chaque site a sa propre stratégie :

| Site | Stratégie |
|------|-----------|
| Greenhouse | `form#application_form button[type="submit"]` |
| Lever | `button.template-btn-submit` |
| SmartRecruiters | `spl-button` avec texte "Envoyer ma candidature" |
| SuccessFactors | Bouton multi-étapes : `Suivant` jusqu'à `Soumettre` |
| Workday | `[data-automation-id="bottom-navigation-next-button"]` puis `Submit Application` |
| iCIMS | `input[type="submit"][value*="Submit"]` |
| Indeed | `button[data-testid="continue-button"]` |

Le module ajoute systématiquement une **confirmation modale** côté popup avant de cliquer Submit final.

---

## 4. Modifications dans l'extension

### 4.1 Nouveaux fichiers

```
cvgen-extension/
├── ai/                         (NOUVEAU dossier)
│   ├── ai-client.js            Client front pour /api/ai (200 lignes env.)
│   └── prompts.js              Constantes de prompts (templates)
├── content/
│   ├── offer-extractor.js      ➤ enrichir (URL, location, contract)
│   └── submit-handler.js       NOUVEAU (250 lignes env.)
├── popup/
│   ├── popup.html              ➤ ajouter écran preview / analyse
│   ├── popup.js                ➤ ajouter handlers AI_*
│   └── popup.css               ➤ styles nouveaux composants
├── service-worker.js           ➤ ajouter case AI_ANALYZE, AI_ADAPT, AI_SUBMIT
└── manifest.json               ➤ scripts: ajouter ai-client.js, submit-handler.js
```

### 4.2 Nouveaux messages internes

| Message | Émetteur | Récepteur | Payload | Réponse |
|---------|----------|-----------|---------|---------|
| `AI_ANALYZE` | Popup | Service worker | `{ offer }` | `{ success, analysis }` |
| `AI_ADAPT` | Popup | Service worker | `{ analysis, autoApply }` | `{ success, adaptedProfile, coverLetter }` |
| `AI_FILL_WITH_ADAPTED` | Popup | Content script | `{ profile, coverLetter, options }` | `{ success, filled, total }` |
| `AI_SUBMIT` | Popup | Content script | `{ confirm }` | `{ success, submittedAt }` |
| `AI_PROGRESS` | Service worker / content | Popup | `{ step, message, progress }` | (push) |

### 4.3 Évolution du popup UI

Trois nouveaux écrans à ajouter au popup (`popup.html`) :

#### Écran 4 — Analyse en cours

```
┌─────────────────────────────────┐
│  🔎 Analyse de l'offre…         │
│                                 │
│  ●●●●●●○○○○ 60 %                │
│                                 │
│  ✓ Extraction de l'offre        │
│  ✓ Comparaison avec votre profil│
│  ⏳ Génération des suggestions  │
└─────────────────────────────────┘
```

#### Écran 5 — Aperçu

```
┌─────────────────────────────────┐
│  Adéquation : ████████░░ 78 %   │
│                                 │
│  ✅ Forces                       │
│    • 3 ans React                │
│    • Expérience scale-up        │
│                                 │
│  ⚠️  Manques                     │
│    • Kubernetes (non mentionné) │
│                                 │
│  💌 Lettre générée (extrait)    │
│    "Madame, Monsieur, …"        │
│    [ Voir / Modifier ]          │
│                                 │
│  [ Adapter & remplir ]          │
│  [ Annuler ]                    │
└─────────────────────────────────┘
```

#### Écran 6 — Soumission

```
┌─────────────────────────────────┐
│  ✓ Formulaire rempli (42/45)    │
│                                 │
│  3 champs nécessitent votre     │
│  attention :                     │
│  • Photo de profil              │
│  • Vidéo de présentation        │
│  • Question libre               │
│                                 │
│  [ ⚡ Soumettre la candidature ] │
│  [ Revoir manuellement ]        │
└─────────────────────────────────┘
```

### 4.4 Squelette `ai/ai-client.js`

```javascript
var AIClient = (function () {
  "use strict";

  async function call(endpoint, payload) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(
        { type: "AI_PROXY", endpoint: endpoint, payload: payload },
        function (response) {
          if (response && response.success) resolve(response.data);
          else reject(new Error(response ? response.error : "AI proxy error"));
        }
      );
    });
  }

  return {
    analyzeOffer: function (offer) {
      return call("/api/ai/analyze", { offer: offer });
    },
    adaptProfile: function (analysisId, opts) {
      return call("/api/ai/adapt", { analysisId: analysisId, options: opts });
    },
    generateCoverLetter: function (analysisId, tone) {
      return call("/api/ai/cover-letter", { analysisId: analysisId, tone: tone });
    },
  };
})();
window.AIClient = AIClient;
```

### 4.5 Squelette `content/submit-handler.js`

```javascript
var SubmitHandler = (function () {
  "use strict";

  var SUBMIT_PATTERNS = {
    "greenhouse.io":     { selector: 'button[type="submit"]', text: ["submit", "apply"] },
    "lever.co":          { selector: 'button.template-btn-submit', text: [] },
    "smartrecruiters":   { selector: 'spl-button', text: ["envoyer", "submit"] },
    "successfactors":    { selector: 'button, a', text: ["soumettre", "submit"] },
    "myworkdayjobs":     { selector: '[data-automation-id*="submit"]', text: [] },
    "icims":             { selector: 'input[type="submit"]', text: ["submit"] },
  };

  function findSubmitButton() {
    var host = window.location.hostname;
    var config = null;
    for (var key in SUBMIT_PATTERNS) {
      if (host.indexOf(key) > -1) { config = SUBMIT_PATTERNS[key]; break; }
    }
    if (!config) return null;
    var candidates = querySelectorAllDeep(document, config.selector);
    for (var i = 0; i < candidates.length; i++) {
      var txt = ((candidates[i].innerText || "") + (candidates[i].value || "")).toLowerCase();
      if (config.text.length === 0 || config.text.some(function (k) { return txt.indexOf(k) > -1; })) {
        return candidates[i];
      }
    }
    return null;
  }

  async function submit(confirm) {
    var btn = findSubmitButton();
    if (!btn) return { success: false, error: "Bouton de soumission introuvable" };
    if (!confirm) return { success: false, error: "Confirmation utilisateur requise" };
    btn.click();
    return { success: true, submittedAt: new Date().toISOString() };
  }

  return { findSubmitButton: findSubmitButton, submit: submit };
})();
window.SubmitHandler = SubmitHandler;
```

---

## 5. Modifications dans le backend CVGen

### 5.1 Nouveaux endpoints REST

| Méthode | Endpoint | Body | Réponse |
|---------|----------|------|---------|
| `POST` | `/api/ai/analyze` | `{ offer: { title, company, offerText, url } }` | `{ analysisId, score, gaps, strengths, suggestedKeywords, topExperienceIds }` |
| `POST` | `/api/ai/adapt` | `{ analysisId, options: { reorderExp, rewriteSummary } }` | `{ adaptedProfile, coverLetter }` |
| `POST` | `/api/ai/cover-letter` | `{ analysisId, tone: "formel"\|"chaleureux"\|"créatif" }` | `{ coverLetter, charCount }` |
| `POST` | `/api/applications` | `{ analysisId, ats, status: "filled"\|"submitted", screenshotUrl? }` | `{ applicationId }` |
| `GET` | `/api/applications?status=&from=` | (query params) | `[{ applicationId, ats, company, status, date }]` |

### 5.2 Schéma de données (entités JPA proposées)

```
@Entity
class JobOffer {
  Long id;
  String url; // canonical
  String title;
  String company;
  String location;
  @Lob String offerText;
  String hashFingerprint;  // sha256(title+company+offerText) pour cache
  Instant fetchedAt;
}

@Entity
class JobAnalysis {
  Long id;
  @ManyToOne User user;
  @ManyToOne JobOffer offer;
  String profileHash;       // sha256 du profil au moment de l'analyse
  Integer score;             // 0-100
  @Lob String analysisJson;  // résultat brut LLM
  Instant createdAt;
}

@Entity
class JobApplication {
  Long id;
  @ManyToOne JobAnalysis analysis;
  String status;             // DRAFT, FILLED, SUBMITTED, FAILED
  String ats;                // greenhouse, smartrecruiters, ...
  @Lob String adaptedProfileSnapshot;  // ce qui a été envoyé
  @Lob String coverLetterSnapshot;
  Instant submittedAt;
  String screenshotUrl;      // optionnel — capture d'écran post-submit
}
```

### 5.3 Service `AiService` (squelette Spring)

```java
@Service
class AiService {
    private final LlmProvider llm;
    private final ProfileService profileService;
    private final JobAnalysisRepository analysisRepo;

    public JobAnalysisResult analyze(User user, JobOfferDto offerDto) {
        // 1. Cache lookup
        var hash = hash(profile, offerDto);
        var cached = analysisRepo.findByHash(hash);
        if (cached.isPresent()) return cached.get();

        // 2. Build prompt + call LLM
        var profile = profileService.getCompleteProfile(user);
        var prompt = PromptTemplates.analyzeOffer(profile, offerDto);
        var response = llm.complete(prompt, ResponseFormat.JSON);

        // 3. Persist
        var analysis = new JobAnalysis(user, offerDto, response);
        analysisRepo.save(analysis);
        return mapToDto(analysis);
    }

    public AdaptedProfile adapt(User user, Long analysisId, AdaptOptions opts) {
        var analysis = analysisRepo.findById(analysisId).orElseThrow();
        var profile  = profileService.getCompleteProfile(user);
        var prompt   = PromptTemplates.adaptProfile(profile, analysis, opts);
        return llm.complete(prompt, AdaptedProfile.class);
    }
}
```

### 5.4 Provider LLM abstrait (`LlmProvider`)

```java
interface LlmProvider {
    String complete(String prompt, ResponseFormat fmt);
    <T> T complete(String prompt, Class<T> targetType);
}

@Component class OpenAiProvider implements LlmProvider { /* … */ }
@Component class MistralProvider implements LlmProvider { /* … */ }
@Component class ClaudeProvider implements LlmProvider { /* … */ }
```

Permet de switcher de provider sans modifier le métier (clean architecture).

---

## 6. Choix de modèles LLM

### 6.1 Critères de choix

- **Qualité** sur tâches de raisonnement structuré (extraction, scoring, reformulation, génération de lettre).
- **Coût** par 1 000 tokens (input/output).
- **Latence** moyenne (l'utilisateur attend dans le popup → idéalement < 5 s).
- **Privacy** : où sont stockées les données ? (RGPD)
- **Réversibilité** : pouvoir changer de provider sans casser l'app.

### 6.2 Comparatif (au 2026-Q2)

| Provider / modèle | Qualité analyse | Coût* | Latence | Privacy | Recommandé pour |
|-------------------|----------------|-------|---------|---------|-----------------|
| **OpenAI** `gpt-4o-mini` | ⭐⭐⭐⭐ | $0.15 / $0.60 (1M tok in/out) | ~2 s | US, opt-out training | MVP rapide |
| **OpenAI** `gpt-4o` | ⭐⭐⭐⭐⭐ | $2.50 / $10 | ~3 s | US | Production premium |
| **Claude 4 Sonnet** | ⭐⭐⭐⭐⭐ | $3 / $15 | ~3 s | US | Génération de lettre (style nuancé) |
| **Mistral Large** | ⭐⭐⭐⭐ | €2 / €6 | ~2 s | EU (RGPD natif) | Bon compromis EU |
| **Mistral Small** | ⭐⭐⭐ | €0.20 / €0.60 | ~1 s | EU | MVP éco |
| **Self-hosted Llama 3 70B** | ⭐⭐⭐⭐ | $$ infra | ~4 s | Total | Long terme, scale |

\* prix indicatifs 2026

### 6.3 Recommandation

- **Sprint MVP** : `gpt-4o-mini` (excellent rapport qualité/prix, JSON mode fiable).
- **V1 production** : routage intelligent — `gpt-4o-mini` pour `analyze`, `claude-3.7-sonnet` pour `cover-letter` (qualité de plume supérieure).
- **V2** : évaluer Mistral pour conformité RGPD européenne (selon roadmap entreprise).

---

## 7. Roadmap d'implémentation (4 sprints)

### Sprint 1 — Fondations backend (2 semaines)

- [ ] Créer entités JPA `JobOffer`, `JobAnalysis`, `JobApplication`
- [ ] Implémenter `LlmProvider` interface + `OpenAiProvider`
- [ ] Endpoint `POST /api/ai/analyze` avec cache (clé = `hash(profile)+hash(offer)`)
- [ ] Templates de prompts (`PromptTemplates.analyzeOffer`)
- [ ] Tests unitaires + intégration mockée
- [ ] Rate limiting (10 req/min/user, quotas mensuels selon plan)

**Livrable** : analyse fonctionnelle appelable via Postman.

### Sprint 2 — UI extension + extraction enrichie (2 semaines)

- [ ] Enrichir `offer-extractor.js` (URL canonique, location, type contrat)
- [ ] Créer `ai/ai-client.js` (façade messaging)
- [ ] Ajouter écrans popup : Analyse en cours, Aperçu, Adaptation
- [ ] Bouton "Analyser cette offre" dans `screen-connected`
- [ ] Tests E2E sur Indeed/LinkedIn

**Livrable** : utilisateur peut analyser une offre et voir le rapport.

### Sprint 3 — Adaptation profil + génération lettre (2 semaines)

- [ ] Endpoint `POST /api/ai/adapt` (réorganise + reformule)
- [ ] Endpoint `POST /api/ai/cover-letter` (3 tons disponibles)
- [ ] UI : édition manuelle de la lettre générée avant utilisation
- [ ] Bouton "Adapter & remplir" → invoque `handleFillForm` avec profil adapté
- [ ] Persistance `JobApplication` (status: FILLED)

**Livrable** : flow complet "Analyser → Adapter → Remplir" sur 3 ATS.

### Sprint 4 — Soumission semi-autonome (3 semaines)

- [ ] Créer `content/submit-handler.js`
- [ ] Stratégies de soumission par ATS (Greenhouse, Lever, SmartRecruiters, Workday, SF en multi-étapes)
- [ ] Confirmation modale **obligatoire** avant clic Submit final
- [ ] Captures d'écran post-soumission (via `chrome.tabs.captureVisibleTab`)
- [ ] Endpoint `POST /api/applications` (suivi)
- [ ] Vue Historique dans le popup

**Livrable** : MVP "auto-postulation assistée" prêt pour bêta-utilisateurs.

### (Post-MVP) Sprint 5 — Mode autonome (4 semaines)

- [ ] Job queue côté backend : liste d'offres à postuler
- [ ] Worker headless (Puppeteer) côté backend pour les ATS les plus ouverts
- [ ] Système d'opt-in renforcé + audit log
- [ ] A/B testing de variantes de lettre / profil

---

## 8. Considérations éthiques, légales et de sécurité

### 8.1 RGPD et données personnelles

- Tout traitement IA doit être documenté dans le **registre RGPD** de CVGen.
- L'utilisateur doit **explicitement consentir** au traitement IA (case à cocher distincte au signup ou opt-in).
- Le profil envoyé au LLM doit être **anonymisable** dans les logs (pseudonymisation des nom/prénom dans les traces).
- Si l'utilisateur supprime son compte, **toutes** les analyses et applications doivent être purgées.

### 8.2 CGU des ATS

- Beaucoup d'ATS interdisent dans leurs CGU l'**automatisation des candidatures** (clauses anti-bot). En particulier :
  - LinkedIn : interdit explicitement (cf. `hiQ Labs v. LinkedIn`).
  - Indeed : interdit le scraping et l'automatisation.
- → Le **mode autonome** doit être désactivé par défaut sur LinkedIn et Indeed.
- → Pour les autres ATS, conditionner à l'acceptation explicite par l'utilisateur d'une clause "vous êtes responsable de vérifier que votre usage respecte les CGU du site cible".

### 8.3 Loyauté de la candidature

- Le candidat doit comprendre que **lui** porte la responsabilité du contenu envoyé (même si rédigé par l'IA).
- **Pas d'invention** de compétences ou d'expériences absentes du profil. Le prompt doit l'**interdire explicitement** (cf. §11).
- Modal d'avertissement la première fois qu'un mode automatisé est utilisé.

### 8.4 Auditabilité

- Toute candidature soumise via IA doit produire un **snapshot complet** côté backend :
  - Texte exact envoyé (`adaptedProfileSnapshot`, `coverLetterSnapshot`)
  - Modèle LLM utilisé et version
  - Hash du prompt
  - Horodatage signé
- En cas de litige (recruteur estime que la candidature est trompeuse) → CVGen peut produire les preuves.

### 8.5 Sécurité technique

- Clé API LLM **jamais** dans l'extension.
- JWT-only sur `/api/ai/*` (les anonymes ne peuvent pas appeler).
- Rate limiting strict (anti-abus, anti-coût).
- Validation et **sanitization** du `offerText` côté backend avant envoi LLM (anti-prompt injection).
- Le `coverLetter` retourné est rendu côté front en `textContent` (jamais `innerHTML`) pour éviter le XSS.

---

## 9. Estimation budgétaire

### 9.1 Coûts LLM par candidature

Estimation pour `gpt-4o-mini` (cible MVP) :

| Étape | Tokens in | Tokens out | Coût |
|-------|-----------|-----------|------|
| Analyze | 3 000 (profil + offre) | 800 | ~$0.0009 |
| Adapt | 4 000 | 2 000 | ~$0.0018 |
| Cover letter | 3 500 | 1 500 | ~$0.0014 |
| **Total** | | | **~$0.005 / candidature** |

Avec `gpt-4o` (premium) : **~$0.04 / candidature**.

### 9.2 Projection mensuelle

| Hypothèse | Coût LLM /mois |
|-----------|---------------|
| 100 utilisateurs × 20 candidatures/mois × gpt-4o-mini | ~$10 |
| 1 000 utilisateurs × 20 candidatures × mix mini/4o | ~$200 |
| 10 000 utilisateurs × 30 × mix premium | ~$3 000 |

Soit un coût marginal extrêmement faible permettant aisément un modèle freemium (10 candidatures IA / mois gratuites, illimité en payant).

### 9.3 Effort développement

| Sprint | Effort dev (j/h) | Effort QA (j/h) |
|--------|------------------|-----------------|
| Sprint 1 (backend) | 10 | 3 |
| Sprint 2 (UI + extraction) | 8 | 3 |
| Sprint 3 (adapt + lettre) | 10 | 4 |
| Sprint 4 (soumission) | 15 | 5 |
| Total MVP | **43 j/h** | **15 j/h** |

---

## 10. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| LLM hallucinations (invente une compétence) | Moyenne | Élevé | Prompt strict ("ne jamais inventer"), validation post-LLM par regex |
| Coûts LLM dérapent | Moyenne | Élevé | Rate limiting, cache, modèles eco par défaut |
| ATS bloque l'extension (CGU) | Faible | Moyen | Mode autonome désactivé par défaut sur LinkedIn/Indeed |
| Prompt injection via offre malveillante | Faible | Moyen | Sanitization + délimiteurs robustes (`<offer>...</offer>`) |
| Litiges utilisateurs ("la lettre n'est pas moi") | Moyenne | Faible | Snapshot + édition manuelle obligatoire avant envoi |
| Latence > 10 s (impatience UX) | Faible | Moyen | Streaming des réponses LLM si possible, écran de progression |
| Lock-in OpenAI | Faible | Faible | Abstraction `LlmProvider` permet le switch |

---

## 11. Annexes — exemples de prompts et payloads

### 11.1 Prompt `analyzeOffer`

```
Tu es un coach en carrière spécialisé dans le recrutement tech.

VOICI LE PROFIL DU CANDIDAT (JSON) :
<profile>
{ ... profil normalisé CVGen ... }
</profile>

VOICI L'OFFRE D'EMPLOI :
<offer>
TITRE: {{title}}
ENTREPRISE: {{company}}
LIEU: {{location}}
DESCRIPTION:
{{offerText}}
</offer>

TÂCHE :
1. Évalue l'adéquation du candidat sur 100.
2. Liste 3 à 5 forces concrètes du profil pour ce poste.
3. Liste 1 à 3 manques objectifs.
4. Identifie 5 à 10 mots-clés du job description à mettre en avant.
5. Sélectionne les IDs des 2-3 expériences les plus pertinentes du profil.

RÈGLES STRICTES :
- N'invente JAMAIS de compétence ou d'expérience absente du profil.
- Si l'offre demande une compétence absente : la mentionner en "gaps".
- Réponds UNIQUEMENT en JSON, schema fourni ci-dessous.

SCHEMA :
{
  "score": int,
  "fit": string (1-2 phrases),
  "strengths": [string],
  "gaps": [string],
  "suggestedKeywords": [string],
  "topExperienceIds": [string]
}
```

### 11.2 Prompt `coverLetter`

```
Tu rédiges une lettre de motivation pour un candidat qui postule au poste suivant.

PROFIL :
<profile>{ ... }</profile>

OFFRE :
<offer>{ ... }</offer>

ANALYSE PRÉCÉDENTE :
<analysis>{ score, strengths, suggestedKeywords ... }</analysis>

CONTRAINTES :
- Longueur : 250 à 350 mots.
- Ton : {{tone}} (formel / chaleureux / créatif).
- Langue : français.
- Structure : Accroche → 2-3 § sur l'adéquation profil ↔ besoin → conclusion appel à l'entretien.
- N'invente JAMAIS d'expérience absente du profil.
- Mentionne 3-5 mots-clés du job description.
- Pas de formule plaquée ("Madame, Monsieur, je me permets…").

Rends UNIQUEMENT le texte de la lettre, prêt à coller dans un formulaire.
```

### 11.3 Réponse type `/api/ai/adapt`

```json
{
  "adaptedProfile": {
    "identite": { /* identique au profil source */ },
    "titrePoste": "Développeur Frontend React Senior — Scale-up B2B",
    "resumeProfessionnel": "5 ans de développement React/TypeScript sur des produits SaaS en forte croissance. Spécialiste de l'architecture micro-frontends et de l'observabilité front (Sentry, Datadog). Cherche à intégrer une équipe ambitieuse pour livrer du produit en continu.",
    "experiences": [
      /* expériences réordonnées : la 3e du profil source en premier */
    ],
    "competences": [
      "React", "TypeScript", "Redux Toolkit",
      "Next.js", "Node.js", "GraphQL",
      /* … réordonnées pour matcher l'offre */
    ],
    "_adaptedFor": {
      "analysisId": 412,
      "offerUrl": "https://jobs.example.com/p/123"
    }
  },
  "coverLetter": "Bonjour,\n\nL'offre Frontend React Senior chez Acme Corp. m'a immédiatement interpellé(e)…\n\n[texte généré complet ~280 mots]\n\nCordialement,\n{{prenom}} {{nom}}"
}
```

### 11.4 Flow message d'extension (côté popup)

```javascript
// popup.js — nouveau bouton "Analyser & postuler"
async function onClickAiApply() {
  // 1. Extraire l'offre depuis la page
  const { offer } = await sendToContentScript({ type: "EXTRACT_OFFER" });

  // 2. Demander l'analyse au backend (via service worker)
  showScreen("ai-analyzing");
  const { analysis } = await sendToServiceWorker({ type: "AI_ANALYZE", payload: { offer } });

  // 3. Afficher l'aperçu et attendre la confirmation
  showScreen("ai-preview");
  renderAnalysis(analysis);
  const userConfirms = await waitForUserChoice();
  if (!userConfirms) return;

  // 4. Adapter le profil et générer la lettre
  showScreen("ai-adapting");
  const { adaptedProfile, coverLetter } = await sendToServiceWorker({
    type: "AI_ADAPT",
    payload: { analysisId: analysis.id }
  });

  // 5. Remplir le formulaire avec le profil adapté
  showScreen("ai-filling");
  await sendToContentScript({
    type: "AI_FILL_WITH_ADAPTED",
    payload: { profile: adaptedProfile, coverLetter, options: { overwrite: true } }
  });

  // 6. Confirmation finale et soumission
  showScreen("ai-confirm-submit");
  const userSubmits = await waitForFinalConfirmation();
  if (!userSubmits) return;

  await sendToContentScript({ type: "AI_SUBMIT", payload: { confirm: true } });

  showScreen("ai-success");
}
```

---

## TL;DR — Plan d'action immédiat

1. **Ne pas modifier l'extension actuelle** avant d'avoir le backend `/api/ai/*` fonctionnel (le front sans backend serait inutile).
2. **Commencer par Sprint 1** : monter `LlmProvider` + endpoint `POST /api/ai/analyze` côté Spring Boot, tester avec Postman.
3. **Choisir un provider LLM** : recommandation `gpt-4o-mini` pour MVP.
4. **Définir les CGU IA** côté CVGen (texte légal + opt-in) **avant** la mise en production.
5. **Puis** dérouler les sprints 2 à 4 côté extension.

L'architecture cible respecte les **frontières de confiance** existantes (extension ↔ service worker ↔ backend ↔ LLM) et **réutilise** intégralement le pipeline de remplissage actuel (`field-detector` + `field-filler` + `dynamic-sections`). Le coût marginal LLM est négligeable (~5 millimes/candidature) et permet un modèle freemium attractif.

> Conseil final : **livrer le mode "Assisté" en premier** (analyse + adaptation + remplissage manuel par l'utilisateur final). L'auto-soumission est une cerise sur le gâteau qui peut attendre la maturité de la base et l'arbitrage juridique.
