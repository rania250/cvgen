# CVGen Extension — Récapitulatif des travaux

> Document de synthèse des modifications apportées à l'extension Chrome CVGen
> Branche : `feature/cvgen-extension`
> Repo : `rania250/cvgen`
> Période couverte : refactor complet du remplissage automatique + support de plusieurs ATS

---

## 1. Vue d'ensemble

L'extension Chrome CVGen permet de remplir automatiquement les formulaires de candidature en ligne à partir du profil utilisateur stocké sur l'API CVGen. Le travail effectué visait à :

1. **Corriger** des bugs bloquants du remplissage de base
2. **Étendre** la compatibilité aux principaux ATS (Applicant Tracking Systems) utilisés par les grands comptes
3. **Ajouter** le support des sections dynamiques (expériences, formations, certifications, langues)
4. **Gérer** les widgets propriétaires de SuccessFactors (utilisé notamment par Capgemini)
5. **Ajouter** l'upload automatique du CV et de la lettre de motivation

---

## 2. Nouvelles fonctionnalités

### 2.1 Remplissage des sections dynamiques (commits multiples)

Les ATS modernes affichent des sections "Ajouter une expérience", "Ajouter une formation", etc. qui créent dynamiquement de nouveaux blocs de champs au clic. L'extension détecte maintenant :

- **Expériences professionnelles** : clique sur le bouton "Ajouter", attend l'apparition du nouveau bloc, le remplit avec les données du profil, puis répète pour chaque expérience.
- **Parcours académique / Formations**
- **Certifications**
- **Langues**

**Mécanique** :
- Détection du bouton "Ajouter" par patterns (`ADD_BUTTON_PATTERNS`) — couvre `Add Experience`, `Ajouter`, `+ Add`, etc.
- Snapshot des boutons "Delete/Supprimer" **avant** le clic
- Clic robuste (`clickElementRobust`) : dispatch d'un `MouseEvent('click')` synthétique **et** injection main-world du `juic.fire()` (pour SuccessFactors)
- Détection du **nouveau** bouton "Delete" apparu après le clic → on remonte jusqu'au plus grand conteneur qui englobe ce delete sans en englober d'autres → c'est l'isolation exacte de la nouvelle entrée
- Attente de la stabilisation du DOM via `MutationObserver` (plus de mutations pendant 250 ms)
- Remplissage des champs du conteneur
- Itération sur le profil utilisateur

### 2.2 Détection avancée des comboboxes SuccessFactors

SF utilise des comboboxes custom (pas des `<select>` standards) avec son framework `juic`. Détection enrichie :

- `role="combobox"` classique
- ET aussi : `aria-owns`, classes contenant `picklistContainer`, `_selectButton`, etc.

Stratégies de remplissage (essayées dans l'ordre) :

1. **Injection directe** : `trySetSFComboboxDirect` — set la `value` via le setter natif + dispatch `input`/`change`/`blur` + eval du `onblur` (qui contient `juic.fire('_onBlur')`)
2. **Ouverture + sélection** : `openSFCombobox` (eval onclick / ArrowDown) puis recherche d'option dans la listbox
3. **Type-to-filter** : pour les listes paginées (ex. "Country of Education"), saisie d'un préfixe pour filtrer
4. **Circuit breaker** : après 3 échecs consécutifs (cause : `isTrusted=false` rejeté par SF), désactivation des tentatives sur cette page → gain ~30 s

### 2.3 Mapping de champs amélioré

- Système de **scoring par spécificité** (longueur du keyword) pour résoudre les ambiguïtés :
  - "S'agit-il de votre diplôme le plus élevé ?" → `diplome_plus_eleve` (et non `diplome`)
  - "Employeur actuel" → `employeur_actuel` (et non `employeur`)
- `SKIP_PATTERNS` pour ignorer les champs piège ("nom de la société" ne doit pas être confondu avec le nom de famille)
- `indicatif_telephone` retourne le nom du pays (`fillSelectField` gère ensuite les alias FR→+33)
- Mapping `langues` enrichi (`nom` + `niveau`) et `certifications`

### 2.4 Highlight visuel des champs non-remplissables

Quand une combobox SF refuse l'injection (limitation `isTrusted` côté SAP) :

- Bordure orange pulsante (`cvgen-needs-manual-fill`)
- Scroll automatique vers le premier champ concerné
- Highlight retiré après 30 s
- Toast de fin enrichi : `⚠ N liste(s) déroulante(s) SuccessFactors à compléter à la main (surlignées en orange)`

### 2.5 Performance

- Réduction des timeouts : `waitForNewFields` (5 s → 2,5 s), `trySetSFComboboxDirect` (350 ms → 120 ms), stabilité DOM (500 ms → 250 ms)
- Circuit breaker SF (3 échecs → arrêt)
- Gain mesuré : **~35 s** sur un formulaire SF complet

### 2.6 Upload automatique du CV et de la lettre de motivation

**Côté popup** :
- Section "Documents PDF" avec 2 boutons "Choisir"
- Stockage du fichier en base64 dans `chrome.storage.local` (clés `cvBase64`, `lmBase64`, `cvFileName`, `lmFileName`)
- Badge **✓ nom_du_fichier** vert quand chargé
- Bouton **×** pour supprimer un fichier du stockage

**Côté content-script** :
- Module `FileUploader` (`file-uploader.js`)
- `findCVInput()` / `findCoverLetterInput()` parcourent le DOM (Shadow DOM inclus) et détectent les `<input type="file">` correspondants via leur contexte (label, parent, accept, aria-label, aria-labelledby sur 5 niveaux)
- `upload()` :
  - Décode le base64 → `Blob` → `File`
  - Crée un `DataTransfer` et assigne `input.files` via le **setter natif** `HTMLInputElement.prototype.files.set` (pour traverser les interceptions de React/Vue)
  - Dispatch `focus → input → change → blur`
  - Vérification post-upload : `input.files[0].name === filename`
  - Détection MIME auto par extension (pdf, docx, doc, odt, rtf, txt, png, jpg)
- `isInputAlreadyFilled()` : ne pas écraser un fichier déjà présent sur le site (sauf si `overwrite=true` dans les préférences)
- Logs détaillés : "CV stocké trouvé : X.pdf → Input CV détecté → ✓ CV uploadé avec succès : X.pdf ✓ vérifié"

### 2.7 Divers

- Suppression du `service-worker.js` dupliqué dans `background/`
- Correction typo `lettreMutation` → `lettreMotivation` (avec migration des données existantes)
- Restriction `content_scripts.matches` aux seuls domaines d'ATS (au lieu de `<all_urls>`)
- `all_frames: true` pour injection dans les iframes (Taleo, Workday)
- Alignement de l'URL API par défaut sur `http://localhost:8080`
- Préférences `prefs.overwrite` et `prefs.showToast` honorées
- Logs sensibles (données profil) passés en niveau `debug`
- Affichage console du compte CVGen utilisé + `console.table` des expériences/formations

---

## 3. Bugs corrigés (historique)

| Symptôme | Cause | Correction |
|---|---|---|
| Service-worker dupliqué | Ancien fichier obsolète | Suppression |
| `Storage.getCoverLetter()` retournait `undefined` | Typo `lettreMutation` | Renommage + migration |
| Extension injectée sur tous les sites | `matches: <all_urls>` | Liste blanche de domaines ATS |
| Préférences ignorées | `popup.js` ne les passait pas au content-script | Lecture + passage explicite |
| Indicatif téléphone vide | Mapping cassé | Retour au nom du pays + alias dans `fillSelectField` |
| Capgemini SF : "Ajouter expérience" ne créait aucun bloc | Le clic synthétique ne déclenchait pas `juic.fire()` | Injection main-world du `onclick` |
| SF : "Ajouter" créait 4 entrées au lieu d'1 | Double trigger (synthétique + main-world) | Détecté qu'un seul `MouseEvent` + main-world fonctionne |
| SF : la nouvelle entrée détectée englobait toutes les entrées (48 inputs au lieu de 24) | `findContainerOfNewInputs` trouvait un ancêtre trop large | Refactor en `findContainerOfNewEntry` : on cherche le **nouveau bouton Delete** apparu et on prend le plus grand ancêtre qui ne contient que **lui** comme delete |
| SF : "Date de début/fin", "Country of Education", "Niveau d'étude" non remplis | Le conteneur détecté était trop **petit** (3 inputs au lieu de 12 — selects chargés en async) | Attente de stabilité DOM (`MutationObserver` 250 ms d'inactivité) |
| SF : "S'agit-il de votre diplôme le plus élevé ?" mappé sur `diplome` | Première correspondance dans `FIELD_MAPPINGS` | Scoring par longueur de keyword (le plus spécifique gagne) |
| SF : "Niveau d'étude" non détecté comme combobox | Pas de `role="combobox"` | Détection élargie (aria-owns, classes SF, sibling `_selectButton`) |
| Remplissage SF trop lent (~90 s) | Tentatives répétées sur comboboxes refusées par `isTrusted` | Circuit breaker après 3 échecs |

---

## 4. Problèmes connus / Limites techniques

### 4.1 SuccessFactors (Capgemini) — comboboxes : remplissage partiel

**Symptôme** : Certaines listes déroulantes SF refusent l'injection même via le setter natif + `onblur` (ex. "Niveau d'étude", "Country of Education" sur certains environnements).

**Cause** : SAP UI5 / SuccessFactors filtre les événements à `isTrusted=false`. Tout événement émis depuis un content-script Chrome a `isTrusted=false` par construction — c'est une garantie du navigateur. Le framework `juic` revalide la sélection côté serveur et rejette les valeurs injectées qui n'ont pas suivi le flux d'événements "réel" (focus → keydown → click sur listbox option, tous trusted).

**Workaround actuel** :
- Tentative d'injection directe + circuit breaker
- Highlight orange des champs non-remplis
- Toast explicite : "X liste(s) à compléter à la main"
- L'utilisateur termine ces 2-3 champs en 10 secondes

**Solutions non viables explorées** :
- Dispatch de `KeyboardEvent`/`PointerEvent` complets → refusés (`isTrusted=false`)
- Eval main-world du `onchange`/`onblur` → fonctionne pour certains champs, pas pour les comboboxes paginées
- Hook sur `juic.fire` → SAP appelle ensuite une validation serveur qui rejette

### 4.2 SuccessFactors — upload de la lettre de motivation : **non fonctionnel**

**Symptôme** : Le widget "Mes documents" de Capgemini SF ne contient **pas** d'`<input type="file">` standard. Le bouton "+" est un `<span role="button">` avec `onclick="juic.fire('48:','action',event)"`.

**HTML observé** :
```html
<div class="attachActions" onclick="juic.fire('48:','action',event);">
  <span tabindex="0" role="button"
        class="glyphicon glyphicon-plus-sign addAttachments"
        id="48:_attachIcon"
        onclick="juic.fire('48:','action',event);">
  </span>
</div>
```

**Cause** : `juic.fire('action')` ouvre soit :
- (a) la **boîte de dialogue native du navigateur** pour sélectionner un fichier — interaction impossible depuis une extension (sécurité Chrome)
- (b) un **modal HTML** avec un input file caché — auquel cas il faudrait fire le click via main-world, attendre le modal, trouver l'input

**Statut** : à investiguer côté utilisateur — il faut compter le nombre d'`<input type="file">` sur la page avant/après le clic sur "+", pour savoir si on est dans le cas (a) ou (b).

```javascript
// À exécuter dans la console Capgemini
document.querySelectorAll('input[type="file"]').length
```

Si **= 0** même après clic sur "+" → cas (a) : techniquement impossible.
Si **≥ 1** → cas (b) : faisable, à implémenter (clic main-world + wait + upload).

### 4.3 Boîtes de dialogue natives (général)

Aucune extension Chrome ne peut interagir avec la boîte native du système de sélection de fichier. C'est une limite **absolue** du sandbox du navigateur. L'unique parade est :
- Que le site expose un `<input type="file">` (même caché derrière un wrapper visuel) — c'est le cas de la majorité des ATS modernes
- Sinon, l'utilisateur doit faire le clic manuel

### 4.4 ATS non testés

Les éléments suivants sont **présumés fonctionner** mais n'ont pas été validés en condition réelle :
- LinkedIn Easy Apply
- Indeed Apply
- Workday (uniquement les formulaires les plus simples)
- Greenhouse, Lever, SmartRecruiters
- Taleo (corrections en place, à valider)

### 4.5 Lettre de motivation générée

L'option "Générer une lettre via CVGen" affiche un message d'indisponibilité. La fonctionnalité côté backend n'est pas encore livrée par la collègue qui s'en occupe. En attendant, l'utilisateur peut uploader manuellement sa lettre via le popup.

---

## 5. Architecture rapide

```
cvgen-extension/
├── manifest.json              # MV3, content_scripts limités aux domaines ATS, all_frames
├── popup/
│   ├── popup.html             # UI : login, profil, doc upload, bouton Remplir
│   ├── popup.js               # Logique : auth, storage, upload CV/lettre, envoi msg
│   └── popup.css
├── content/
│   ├── content-script.js      # Entrée : lit profil, scanne champs, oriente vers les fillers
│   ├── field-detector.js      # FIELD_MAPPINGS + SKIP_PATTERNS + scoring spécificité
│   ├── field-mapper.js        # Map type de champ → valeur du profil
│   ├── field-filler.js        # Injection valeur + events + showCompletionToast + highlightUnfilledFields
│   ├── dynamic-sections.js    # Sections expérience/formation/cert/langue + SF comboboxes + circuit breaker
│   └── file-uploader.js       # findCVInput / findCoverLetterInput / upload (setter natif)
├── background/
│   └── service-worker.js      # API calls vers le backend CVGen
├── utils/
│   ├── storage.js             # Wrapper chrome.storage.local (avec migration legacy keys)
│   ├── api-client.js          # fetch wrapper avec auth token
│   └── logger.js              # Logger avec niveaux
└── options/
    ├── options.html           # Préférences (overwrite, showToast, apiBaseUrl)
    └── options.js
```

---

## 6. Pour la suite

### Reste à investiguer
- [ ] Upload lettre Capgemini SF : compter les `<input type="file">` avant/après clic "+"
- [ ] Si modal HTML : implémenter wait + upload
- [ ] Si file picker natif : afficher message clair "upload manuel requis"

### Améliorations possibles
- [ ] Support d'autres formats pour les CV (docx déjà supporté côté MIME, à valider côté ATS)
- [ ] Détection auto du nom du candidat depuis le PDF (pour ne pas dépendre du profil)
- [ ] Tests E2E sur les principaux ATS via Playwright
- [ ] Gestion fine du `prefs.autoFill` (remplissage à l'ouverture de la page)
- [ ] Boutons "Sauvegarder/OK" cliqués automatiquement après remplissage d'un modal dynamique
- [ ] Internationalisation (actuellement français + quelques fallbacks anglais)

### Refactorings souhaitables
- [ ] `dynamic-sections.js` fait ~1500 lignes : à scinder par responsabilité (clic, container detection, SF comboboxes, fillers par section)
- [ ] Centraliser tous les `setTimeout` derrière une fonction `wait()` avec budget global
- [ ] Tests unitaires sur le scoring de `detectSubfieldType`

---

## 7. Conseils de debug

Ouvrir la console du site cible et regarder les logs `[CVGen]`. Niveaux disponibles :
- `Logger.log` : actions normales (champ rempli, section ajoutée)
- `Logger.debug` : très verbeux (chaque scan, chaque candidat de mapping)
- `Logger.warn` : échecs récupérables (combobox SF refusée)
- `Logger.error` : bugs

Pour activer le mode debug :
```javascript
chrome.storage.local.set({ logLevel: 'debug' })
```

Pour inspecter le profil chargé :
```javascript
chrome.storage.local.get('profile', console.log)
```

Pour vider le storage et repartir de zéro :
```javascript
chrome.storage.local.clear()
```

---

## 8. Historique des commits récents (branche `feature/cvgen-extension`)

```
ff5e85a feat(extension): upload CV/Lettre robuste + UX popup
16b0ffe perf(extension): accélère le remplissage de ~35s sur SuccessFactors
af40579 feat(extension): highlight visuel des comboboxes SF à remplir manuellement
0ec703c chore(extension): log détaillé de l'état SF après injection directe
c81d751 feat(extension): bypass isTrusted SF via injection directe + onblur
a9779bc feat(extension): support sections "Certifications" et "Langues"
1abf4ff fix(extension): rapidité — circuit breaker + ArrowDown pour comboboxes SF
62f5984 fix(extension): combobox SF — eval onclick + debug log dropdowns visibles
4b585ca fix(extension): détection combobox SF + matching par spécificité + filtre Country
7e5d9af feat(extension): fillSFCombobox + logging détaillé par input
c7c6997 fix(extension): container entrée détecté via bouton Supprimer (englobe selects async)
a04a59e fix(extension): restaure synthetic click + main world click pour SF
42d28db fix(extension): SF n'ajoute plus 4 entrées par clic + isolation par bouton Supprimer
0136d36 fix(extension): détecte re-render SuccessFactors et remplit la bonne entrée
b98748d fix(extension): bouton Ajouter scopé par type + container détecté par diff DOM
949362f fix(extension): déclencher juic.fire de SuccessFactors via main world injection
9094121 fix(extension): clic agressif sur toutes les cibles + diagnostic complet SF
92802c0 fix(extension): cliquer le bon enfant interactif sur SuccessFactors
57865f6 fix(extension): clic robuste SuccessFactors (PointerEvent + Touch + MouseEvent)
28d316d fix(extension): détection fiable des entrées via boutons "Supprimer" + dump profil console
b03c325 fix(extension): "nom de la société" plus rempli avec le last name + anti-doublons d'entrées
95a2aa0 fix(extension): URL API par défaut sur http://localhost:8080
3bf99af chore(extension): log visible du compte CVGen utilisé lors du remplissage
716edd1 fix(extension): faux positifs détection + régression code pays + events Taleo
644b8e0 fix(extension): bugs critiques + support Capgemini Taleo
```

---

**Document généré le 24 mai 2026**
Pour toute question sur ce travail : voir l'historique git détaillé de la branche `feature/cvgen-extension`.
