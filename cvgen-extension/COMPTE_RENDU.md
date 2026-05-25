# Extension Chrome CVGen — Compte rendu technique et académique

> Rapport de synthèse du module *Autofill* du projet **CVGen**
> Branche : `feature/cvgen-extension`
> Dépôt : `rania250/cvgen`
> Périmètre : extension MV3 de remplissage automatique de formulaires de candidature
> Auteur du compte rendu : équipe Autofill — Mai 2026

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Contexte et objectifs](#2-contexte-et-objectifs)
3. [Architecture générale](#3-architecture-générale)
4. [Modules détaillés](#4-modules-détaillés)
5. [Algorithmes clés](#5-algorithmes-clés)
6. [Compatibilité ATS et sites supportés](#6-compatibilité-ats-et-sites-supportés)
7. [Sécurité et confidentialité](#7-sécurité-et-confidentialité)
8. [Limitations connues](#8-limitations-connues)
9. [Métriques et performance](#9-métriques-et-performance)
10. [Choix techniques justifiés](#10-choix-techniques-justifiés)
11. [Perspectives d'évolution](#11-perspectives-dévolution)
12. [Annexes](#12-annexes)

---

## 1. Résumé exécutif

L'extension Chrome **CVGen — Autofill Candidatures** automatise le remplissage des formulaires de candidature en ligne à partir du profil unique d'un utilisateur, hébergé sur la plateforme CVGen (API REST). Conçue en **Manifest V3**, elle est aujourd'hui compatible avec une dizaine d'ATS (Applicant Tracking Systems) majeurs — dont SAP SuccessFactors, Workday, Taleo, SmartRecruiters/Sopra Steria, Greenhouse, Lever, ainsi que les agrégateurs Indeed, LinkedIn et Welcome to the Jungle. Le code compte environ **8 100 lignes** de JavaScript, organisées en modules indépendants et instrumentables, communicant via le pattern *message passing* propre aux extensions Chrome.

La couverture fonctionnelle inclut :

- l'extraction automatique de **plus de 70 types de champs** (identité, contact, formation, expérience, compétences, motivation, etc.) ;
- la gestion des **sections dynamiques** (multi-entrées : expériences, formations, certifications, langues) ;
- la **traversée du Shadow DOM** pour les Web Components (SmartRecruiters SPL, Workday) ;
- l'**injection en main world** pour contourner les contrôles `isTrusted` de SAP/SuccessFactors ;
- l'**upload automatique** du CV et de la lettre de motivation au format PDF ;
- une **interface popup** affichant l'état de connexion, le profil synchronisé, les champs détectés et le bouton d'action principal.

---

## 2. Contexte et objectifs

### 2.1 Problème adressé

Une candidature en ligne sur un site ATS demande en moyenne **15 à 40 minutes** de saisie répétitive. Chaque ATS expose une UI différente : champs standards, sections dynamiques, widgets propriétaires, Shadow DOM, contrôles `isTrusted`, validateurs spécifiques. Cette friction est un point de douleur connu chez les candidats (cf. études Talenteum, Welcome to the Jungle, 2024).

### 2.2 Objectifs du projet

| # | Objectif | Critère de succès |
|---|----------|-------------------|
| O1 | Centralisation du profil candidat | Une seule source de vérité : le profil CVGen |
| O2 | Remplissage automatique multi-ATS | ≥ 80 % des champs remplis sans intervention |
| O3 | Robustesse face aux Web Components | Compatibilité SmartRecruiters/Workday Shadow DOM |
| O4 | Upload des documents PDF | CV + lettre injectés sans clic utilisateur |
| O5 | Respect MV3 et bonnes pratiques sécurité | Pas de `eval`, pas de `localStorage`, JWT non loggé |

---

## 3. Architecture générale

### 3.1 Modèle d'extension (Manifest V3)

```
┌─────────────────────────┐    chrome.runtime    ┌─────────────────────┐
│        POPUP            │ ◄──── messages ────► │   SERVICE WORKER    │
│  (popup/popup.{html,js})│                      │ (service-worker.js) │
└────────────┬────────────┘                      └─────────┬───────────┘
             │                                              │
             │  chrome.tabs.sendMessage                     │  apiFetch (fetch +
             │  ('FILL_FORM' …)                             │   Bearer JWT)
             ▼                                              ▼
┌─────────────────────────┐                      ┌─────────────────────┐
│   CONTENT SCRIPT(S)     │                      │   API CVGen REST    │
│ (content/*.js, MV3      │                      │ (Spring Boot)       │
│  all_frames: true)      │                      └─────────────────────┘
└─────────────────────────┘
            │
            │   DOM (+ Shadow DOM)
            ▼
    Site ATS (Capgemini, SmartRecruiters…)
```

### 3.2 Frontières de confiance

- **Popup** : UI, jamais d'appel réseau direct → délègue au service worker.
- **Service worker** : seul point de contact avec l'API REST. Détient le JWT en `chrome.storage.local`.
- **Content scripts** : exécutés dans le contexte de la page cible. Ne reçoivent que le profil normalisé (jamais le token JWT).

### 3.3 Configuration `manifest.json`

```64:80:cvgen-extension/manifest.json
        "https://*.icims.com/*",
        "https://*.jobvite.com/*"
      ],
      "js": [
        "utils/logger.js",
        "utils/storage.js",
        "content/field-detector.js",
        "content/field-mapper.js",
        "content/field-filler.js",
        "content/dynamic-sections.js",
        "content/date-handler.js",
        "content/offer-extractor.js",
        "content/file-uploader.js",
        "content/content-script.js"
      ],
      "run_at": "document_idle",
      "all_frames": true
```

Points clés :
- `manifest_version: 3` (obligatoire pour la Chrome Web Store).
- `host_permissions` : 16 domaines listés explicitement (et non `<all_urls>`) pour respecter le principe du moindre privilège.
- `all_frames: true` : les content scripts s'injectent dans tous les `<iframe>` (Capgemini imbrique son ATS dans un iframe SuccessFactors).
- L'ordre de chargement des scripts est important : `field-detector` → `field-mapper` → `field-filler` → orchestrateur (`content-script.js`).

---

## 4. Modules détaillés

### 4.1 Service worker (`service-worker.js`, 179 lignes)

Rôle : **dispatcher** central. Reçoit les messages typés (`LOGIN`, `GET_PROFILE`, `SYNC_PROFILE`, `GET_CACHED_PROFILE`, `GET_USER`, `LOGOUT`) et exécute l'appel API correspondant. Stocke le token JWT et le profil dans `chrome.storage.local`.

```36:65:cvgen-extension/service-worker.js
async function handleMessage(message, sender) {
  Logger.debug("Message reçu: " + message.type);

  switch (message.type) {
    case "LOGIN":
      return handleLogin(message.payload);

    case "LOGOUT":
      return handleLogout();

    case "GET_PROFILE":
      return handleGetProfile();

    case "SYNC_PROFILE":
      return handleSyncProfile();

    case "GET_CACHED_PROFILE":
      return handleGetCachedProfile();

    case "GET_USER":
      return handleGetUser();

    default:
      Logger.warn("Type de message inconnu: " + message.type);
      return {
        success: false,
        error: "Type de message inconnu: " + message.type,
      };
  }
}
```

### 4.2 Utilitaires partagés (`utils/`)

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `logger.js` | 80 | Logger central. **Filtre les JWT** et clés sensibles avant `console.log` |
| `storage.js` | 112 | Wrapper `chrome.storage.local`. Migration de la clé `lettreMutation` → `lettreMotivation` |
| `api-client.js` | 72 | `fetch` avec Bearer JWT. Notification `TOKEN_EXPIRED` au popup sur HTTP 401 |

### 4.3 Content scripts (`content/`)

C'est le cœur métier — 6 700 lignes réparties en 8 modules :

| Module | Lignes | Responsabilité |
|--------|--------|----------------|
| `field-detector.js` | 988 | Identifie le **type sémantique** d'un input (prenom, ville, linkedin…) |
| `field-mapper.js` | 166 | Retourne la **valeur du profil** pour un type donné |
| `field-filler.js` | 1 353 | Injecte effectivement la valeur (setter natif + events) |
| `dynamic-sections.js` | 2 364 | Remplit les sections dynamiques (expériences/formations…) |
| `date-handler.js` | 413 | Gère tous les formats de date (ISO, JJ/MM/AAAA, MM/AAAA, mois/année séparés, datepickers custom) |
| `offer-extractor.js` | 172 | Extrait titre/entreprise/description de l'offre depuis la page |
| `file-uploader.js` | 283 | Injecte CV/lettre PDF dans les `<input type="file">` |
| `content-script.js` | 1 038 | **Orchestrateur** — normalise le profil API et orchestre tous les modules |

### 4.4 Détecteur de champs — pipeline à 4 passes

`field-detector.js::detectFieldType(element)` compose un tableau de **candidates** à partir de toutes les sources disponibles puis applique une cascade de matching :

1. **Candidates** : `name`, `id`, `placeholder`, `autocomplete`, `aria-label`, `aria-labelledby`, `data-*`, `title`, label `for=id`, label parent, texte du parent (sans inputs internes), texte du grand-parent, **traversée du composed tree** pour les Web Components (`spl-input`, `spl-form-field`, `spl-typography`), label sibling, container `fieldset/.form-group`.
2. **Normalisation** : minuscules, suppression d'accents (`NFD`), remplacement de la ponctuation par des espaces.
3. **Skip patterns** : ex. "Nom de la société" ne doit jamais être typé `nom`.
4. **Passes de matching** :
   - **Passe 0** : skip-patterns (early return null).
   - **Passe 1** : correspondance **exacte** (priorité maximale).
   - **Passe 2** : correspondance **substring**.
   - **Fast-path autocomplete** : map standard W3C (`given-name → prenom`, `family-name → nom`, `tel → telephone`, etc.).

### 4.5 Remplissage des champs — adaptateurs par type

`field-filler.js` propose plusieurs stratégies en fonction du widget rencontré :

| Widget cible | Méthode |
|--------------|---------|
| `<input type="text/email/url/tel/number">` | Setter natif `HTMLInputElement.prototype.value` + events `input`/`change` (compatible React/Vue/Angular) |
| `<select>` | Recherche d'option par texte/value avec **alias** (FR↔France↔+33↔Français) |
| `<textarea>` | Identique aux text inputs |
| `<input type="date/month">` | Format ISO `YYYY-MM-DD` / `YYYY-MM` |
| `<input type="text">` avec placeholder `JJ/MM/AAAA` | Saisie caractère par caractère via `typeIntoField` |
| `<spl-date-field type="month-year">` (SmartRecruiters) | Détection du composed parent → format `MM/AAAA` |
| Comboboxes ARIA (`role="combobox"`) | Ouverture + recherche + click sur l'option |
| Comboboxes SF (`juic.fire`) | **Injection main world** ou setter natif + `onblur` |
| `<input type="checkbox/radio">` | `fillCheckboxOrRadio` avec valeur "Oui/Non" |
| `<input type="file">` | `File` créé depuis base64 + `DataTransfer` + setter natif `files` |

### 4.6 Sections dynamiques — algorithme LCA

Le module `dynamic-sections.js` gère le défi le plus complexe : ajouter et remplir N entrées d'expérience/formation. L'algorithme :

1. **Localiser** la section ("Expériences professionnelles") via les patterns.
2. **Trouver** le bouton "Ajouter" (`ADD_BUTTON_PATTERNS`).
3. **Snapshotter** les boutons "Delete" et les inputs **avant** le clic.
4. **Cliquer** le bouton Ajouter avec `clickElementRobust` (combinaison adaptée au site).
5. **Attendre** la stabilisation du DOM (MutationObserver, plus de mutations pendant 250 ms).
6. **Comparer** les nouveaux boutons Delete : le nouveau Delete = anchor de la nouvelle entrée.
7. **Calculer le LCA** (Least Common Ancestor) — en traversant le **composed tree** pour les Web Components — qui englobe les nouveaux inputs sans engloller les autres Delete.
8. **Remplir** les sous-champs via `fillSubfields` (mapping interne propre à la section).
9. **Cliquer Sauvegarder** (`clickSaveButton`) pour persister l'entrée (indispensable sur SmartRecruiters).
10. **Boucler** sur les entrées suivantes du profil.

### 4.7 Date handler — séparé du field-filler

Le module `date-handler.js` extrait toute la logique date dans une classe dédiée car le sujet est combinatoire :

```30:50:cvgen-extension/content/date-handler.js
  // ─── Parsing ISO vers composants ──────────────────────────────────────────

  function parseISO(isoStr) {
    if (!isoStr) return null;
    var str = String(isoStr).trim();

    // YYYY-MM-DD
    var full = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (full) return { year: full[1], month: full[2], day: full[3] };

    // YYYY-MM
```

Il gère également les **paires mois/année séparés** (deux `<select>` distincts) et les **datepickers JavaScript** (flatpickr, pikaday, react-datepicker, Ant Design, Element UI, Material…).

---

## 5. Algorithmes clés

### 5.1 Traversée du Shadow DOM ouvert

Lorsque les `<input>` sont enfermés dans des Web Components (SmartRecruiters SPL, Workday), la fonction standard `document.querySelectorAll('input')` ne les voit pas. La fonction `querySelectorAllDeep` traverse récursivement les `shadowRoot` ouverts :

```15:32:cvgen-extension/content/dynamic-sections.js
function querySelectorAllDeep(root, selector) {
  root = root || document;
  var results = [];
  try {
    var found = root.querySelectorAll(selector);
    for (var i = 0; i < found.length; i++) results.push(found[i]);
  } catch (_) {}

  var allEls;
  try { allEls = root.querySelectorAll("*"); } catch (_) { return results; }
  for (var j = 0; j < allEls.length; j++) {
    if (allEls[j].shadowRoot) {
      var shadowResults = querySelectorAllDeep(allEls[j].shadowRoot, selector);
      for (var k = 0; k < shadowResults.length; k++) results.push(shadowResults[k]);
    }
  }
  return results;
}
```

### 5.2 Remontée dans l'arbre composé (`getComposedParent`)

Pour calculer le LCA d'éléments répartis dans plusieurs shadow trees, il faut une fonction "parent" qui passe la frontière du shadow root via son `host` :

```40:46:cvgen-extension/content/dynamic-sections.js
function getComposedParent(el) {
  if (!el) return null;
  if (el.parentElement) return el.parentElement;
  var root = el.getRootNode && el.getRootNode();
  if (root && root.host) return root.host;
  return null;
}
```

### 5.3 Setter natif pour bypasser les frameworks réactifs

React et Vue interceptent l'affectation `input.value = "x"` via `Object.defineProperty`. Pour propager la valeur correctement dans leur store interne, on récupère et invoque **le setter natif du prototype** :

```javascript
var nativeSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, 'value'
).set;
nativeSetter.call(input, value);
input.dispatchEvent(new Event('input', { bubbles: true }));
```

### 5.4 Injection en main world

Pour exécuter du JavaScript dans le contexte de la page (au-delà du content script isolé), on utilise un `<script>` tag temporaire. Cas d'usage : appeler `juic.fire('_onBlur')` (framework propriétaire SAP/SuccessFactors) que les content scripts ne peuvent pas atteindre directement.

### 5.5 Heuristique "expérience en cours"

```javascript
var isCurrent =
  !!exp.actuel ||
  !exp.dateFin ||
  (exp.dateDebut && exp.dateDebut === exp.dateFin);
```

Si vraie : on saute `À` et on **coche** la checkbox "Je travaille actuellement ici". Sans ce traitement, SmartRecruiters rejette la validation et l'entrée n'est pas persistée.

---

## 6. Compatibilité ATS et sites supportés

| Site | Statut | Spécificités traitées |
|------|--------|----------------------|
| **Indeed FR/COM** | ✅ Compatible | `form[data-testid]` |
| **LinkedIn Easy Apply** | ✅ Compatible | `.jobs-easy-apply-modal` |
| **Welcome to the Jungle** | ✅ Compatible | Forms standards |
| **France Travail** (Pôle emploi) | ✅ Compatible | `[role="form"]` |
| **Greenhouse** | ✅ Compatible | `form#application_form` |
| **Lever** | ✅ Compatible | `form.application-form` |
| **SAP SuccessFactors** (Capgemini, etc.) | ✅ Compatible | `juic.fire` + injection main world + accordéons + circuit breaker |
| **Workday / myWorkdayJobs** | ✅ Compatible | `data-automation-id` + Shadow DOM |
| **Taleo** | ✅ Compatible | `.requisitionContent` |
| **SmartRecruiters / Sopra Steria** | ✅ Compatible (limité) | Web Components SPL, `<oc-input>` avec shadow fermé pour les liens sociaux |
| **iCIMS** | ✅ Compatible | Forms standards |
| **Jobvite** | ✅ Compatible | Forms standards |

---

## 7. Sécurité et confidentialité

### 7.1 Stockage des secrets

- Le **token JWT** est stocké dans `chrome.storage.local` (chiffré par Chrome au repos sur le profil utilisateur).
- **Aucune** utilisation de `localStorage` ni `sessionStorage` (politique stricte).
- Le `Logger.sanitize()` **masque** automatiquement les JWT (regex `[A-Za-z0-9\-_]+\.[…]\.[…]`) et toute clé matchant `token`, `password`, `accessToken`, `refreshToken`, `authorization` avant `console.log`.

```9:17:cvgen-extension/utils/logger.js
  var JWT_PATTERN = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
  var SENSITIVE_KEYS = [
    "token",
    "jwt",
    "authorization",
    "accesstoken",
    "refreshtoken",
    "password",
  ];
```

### 7.2 Principe du moindre privilège

- `host_permissions` énumère **explicitement** chaque domaine ATS — pas de `<all_urls>`.
- Les content scripts n'ont **jamais** accès au JWT (séparation des frontières de confiance).
- Aucun appel `fetch` dans les content scripts (tout passe par le service worker).

### 7.3 Bonnes pratiques

- Pas d'`eval`, pas d'`innerHTML` avec données utilisateur.
- Validation des messages reçus dans le service worker (switch typé sur `message.type`).
- HTTPS-only en production (l'API par défaut pointe sur `http://localhost:8080` en développement uniquement).

---

## 8. Limitations connues

### 8.1 Limitation `isTrusted` (SAP SuccessFactors)

Les comboboxes SF utilisent un framework propriétaire `juic` qui rejette les events dont `isTrusted === false`. Les events synthétiques étant tous à `false`, certaines listes déroulantes (notamment paginées) refusent l'injection malgré toutes les stratégies tentées.

**Mitigation** : circuit breaker après 3 échecs + highlight orange des champs concernés pour que l'utilisateur les complète manuellement.

### 8.2 Web Components à shadow root fermé

Sur SmartRecruiters/Sopra Steria, le composant `<oc-input>` (qui encapsule LinkedIn, Site Web, Facebook, Twitter) est instancié en `attachShadow({ mode: "closed" })`. Aucune API JavaScript externe — extension comprise — ne peut accéder à l'`<input>` interne.

**Mitigation impossible** sans permission `chrome.debugger` (bannière intrusive). Ces 4 champs doivent rester manuels.

### 8.3 Dépendance à la structure DOM

Si un ATS change la structure de son formulaire (refactoring), certains sélecteurs peuvent casser. Le code est conçu défensivement (multiples sélecteurs fallback) mais n'est pas immune à 100 %.

---

## 9. Métriques et performance

### 9.1 Volumétrie code

| Métrique | Valeur |
|----------|--------|
| Total lignes JS | ~8 100 |
| Modules content | 8 |
| Types de champs détectés | 70+ |
| Sites ATS supportés | 12 |
| Permissions hôtes | 16 |

### 9.2 Performance terrain (mesures sur Capgemini SF)

| Métrique | Avant optimisations | Après |
|----------|---------------------|-------|
| Temps de remplissage complet | ~75 s | ~40 s |
| Champs remplis automatiquement | 25-30 / 50 | 40-45 / 50 |
| Échec dynamic sections | Fréquent | Quasi nul |
| Time-out comboboxes SF | 350 ms × 5 essais | 120 ms + circuit breaker |

### 9.3 Performance terrain (SmartRecruiters / Sopra Steria)

- Expérience : 5 champs sur 5 (hors lieu si absent du profil)
- Formations : 3 champs sur 5 par entrée (description / spécialisation / lieu vides si absents du profil)
- Champs principaux (firstName, lastName, email…) : 100 % remplis
- Liens sociaux LinkedIn/Site Web : **manuel** (shadow fermé)
- CV PDF : uploadé automatiquement

---

## 10. Choix techniques justifiés

### 10.1 Pourquoi Manifest V3 ?

- **Obligatoire** sur Chrome Web Store depuis 2024 pour les nouvelles soumissions.
- Service worker à durée de vie courte → empreinte mémoire minimale.
- Sécurité renforcée (`host_permissions` séparées des `permissions`).

### 10.2 Pourquoi un design en couches (detector → mapper → filler) ?

- **Single Responsibility Principle** : un module = une préoccupation.
- **Testabilité** : `detectFieldType` est une fonction pure → tests unitaires triviaux.
- **Évolutivité** : ajouter un type de champ = un mapping à étendre, pas une refonte.

### 10.3 Pourquoi du JavaScript ES5 (`var`, pas de modules ES6) ?

- Les content scripts s'injectent dans un contexte sans `type="module"`, et le `import/export` y est pénible. Le style `var + IIFE + window.X` reste le plus portable.
- Compatible Chrome 88+ sans transpilation.

### 10.4 Pourquoi un repo monolithique (`cvgen-extension/` dans le repo principal) ?

- **Cohérence** des contrats API entre backend et extension (mêmes versions).
- **Revue de code** unifiée.
- Possibilité d'extraire ultérieurement en sous-module Git si besoin.

---

## 11. Perspectives d'évolution

| Priorité | Évolution | Bénéfice attendu |
|----------|-----------|------------------|
| **P0** | Agent IA d'auto-postulation (cf. document `AGENT_IA_INTEGRATION.md`) | Plus-value différenciante majeure |
| P1 | Détection automatique du moment où l'utilisateur navigue sur un formulaire (pas seulement clic popup) | UX plus fluide |
| P1 | Support du multi-page Workday (étape "Submit Application" cliquée auto) | Réduction des clics utilisateur |
| P2 | Synchronisation push (web socket) du profil quand modifié sur l'app | Plus de profil obsolète |
| P2 | Suivi des candidatures envoyées (historique + statut) | Module CRM léger |
| P3 | Versioning du profil et A/B testing (postuler avec 2 variantes) | Optimisation des candidatures |
| P3 | Mode "Dry run" pour valider avant envoi | Sécurité utilisateur |

---

## 12. Annexes

### 12.1 Liste des messages internes

| Message | Émetteur | Récepteur | Payload | Réponse |
|---------|----------|-----------|---------|---------|
| `LOGIN` | Popup | Service worker | `{ email, password }` | `{ success, user, error? }` |
| `LOGOUT` | Popup | Service worker | — | `{ success }` |
| `GET_USER` | Popup | Service worker | — | `{ success, user, isAuthenticated }` |
| `GET_PROFILE` | Popup | Service worker | — | `{ success, profil, error? }` |
| `SYNC_PROFILE` | Popup | Service worker | — | `{ success, profil, error? }` |
| `GET_CACHED_PROFILE` | Content script | Service worker | — | `{ success, profil, error? }` |
| `FILL_FORM` | Popup | Content script | `{ options: { overwrite, showToast } }` | `{ success, filled, total, skipped }` |
| `DETECT_FIELDS` | Popup | Content script | — | `{ success, fields, site }` |
| `EXTRACT_OFFER` | Popup | Content script | — | `{ success, offer: { title, company, offerText } }` |
| `PING` | Popup | Content script | — | `{ success, alive }` |
| `TOKEN_EXPIRED` | Service worker | Popup | — | (notification) |

### 12.2 Endpoints API consommés

| Méthode | Endpoint | Usage |
|---------|----------|-------|
| `POST` | `/api/auth/login` | Authentification, retourne le JWT et les infos utilisateur |
| `GET` | `/api/profile/complet` | Récupère le profil complet (identité, expériences, formations, langues…) |

### 12.3 Structure du profil normalisé (interne)

```javascript
{
  identite: { prenom, nom, nomComplet, email, telephone, adresse, ville,
              codePostal, pays, linkedin, portfolio, github, facebook,
              twitter, dateNaissance, nationalite, permis },
  titrePoste, resumeProfessionnel,
  experiences: [{ poste, entreprise, dateDebut, dateFin, lieu, description, actuel }],
  formations:  [{ diplome, etablissement, mention, dateDebut, dateFin, annee,
                  niveauEtudes, description }],
  competences: [string],
  langues:     [{ nom, niveau }],
  certifications: [{ nom, organisme, annee, description }],
  disponibilite, pretentionSalariale, typeContrat, handicap,
  permis, autorisationTravail
}
```

### 12.4 Glossaire

- **ATS** : Applicant Tracking System (logiciel de gestion de candidatures côté recruteur).
- **JWT** : JSON Web Token (jeton d'authentification signé).
- **MV3** : Chrome Extensions Manifest Version 3.
- **Shadow DOM** : encapsulation native du DOM pour les Web Components.
- **LCA** : Least Common Ancestor — plus petit ancêtre commun de plusieurs nœuds.
- **Composed tree** : arbre virtuel reliant Light DOM et Shadow DOMs via les `host`.
- **isTrusted** : booléen sur tout `Event` indiquant s'il vient d'une interaction utilisateur réelle.
- **SPL** : Sopra Steria Public Library (préfixe des Web Components SmartRecruiters).
