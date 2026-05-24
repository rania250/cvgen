/**
 * CVGen Dynamic Sections Filler
 * Remplit les sections dynamiques des formulaires (Expériences, Formations)
 * en cliquant sur les boutons "Ajouter" puis en remplissant les sous-champs.
 *
 * Compatible SuccessFactors (accordéons), Workday, Taleo, SmartRecruiters.
 */

// ─── Détecteurs de sections ───────────────────────────────────────────────────

var SECTION_PATTERNS = {
  experience: [
    "expérience professionnelle",
    "experience professionnelle",
    "expériences professionnelles",
    "expériences",
    "parcours professionnel",
    "historique professionnel",
    "work experience",
    "employment history",
    "professional experience",
    "work history",
    "career history",
  ],
  formation: [
    "formation",
    "formations",
    "parcours académique",
    "parcours academique",
    "formations et certifications",
    "niveau d études",
    "diplôme",
    "education",
    "educational background",
    "academic background",
    "qualifications",
    "academic history",
  ],
};

// ─── Gestion des accordéons (SuccessFactors, etc.) ────────────────────────────

/**
 * Cherche un accordéon/section repliée par son titre et l'ouvre si nécessaire.
 * Retourne l'élément header trouvé (même s'il était déjà ouvert).
 *
 * @param {'experience'|'formation'} type
 * @returns {Promise<Element|null>}
 */
async function expandSection(type) {
  var patterns = SECTION_PATTERNS[type].map(normalize);

  // Sélecteurs courants pour les headers d'accordéon (SF, Workday, Taleo, etc.)
  var candidates = Array.from(
    document.querySelectorAll(
      'button, [role="button"], summary, a, h2, h3, h4, h5, ' +
        '[class*="accordion"], [class*="section-header"], [class*="panel-title"], ' +
        '[class*="panel-heading"], [class*="acc-header"], [class*="acc-title"], ' +
        '[class*="toggle"], [class*="collapse"], [class*="expand"]',
    ),
  );

  var headerEl = null;
  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    // On limite la longueur du texte pour éviter les false-positives (page entière)
    var raw = (el.innerText || el.textContent || "").substring(0, 200);
    var text = normalize(raw);
    for (var j = 0; j < patterns.length; j++) {
      if (text.includes(patterns[j])) {
        headerEl = el;
        break;
      }
    }
    if (headerEl) break;
  }

  if (!headerEl) return null;

  // Vérifier si la section est repliée
  var isCollapsed =
    headerEl.getAttribute("aria-expanded") === "false" ||
    headerEl.getAttribute("aria-selected") === "false" ||
    headerEl.classList.contains("collapsed") ||
    headerEl.closest('[aria-expanded="false"]') !== null;

  if (isCollapsed) {
    Logger.log("Ouverture accordéon : " + (headerEl.innerText || "").trim());
    headerEl.click();
    await waitForNewFields(700);
  }

  return headerEl;
}

// Mots-clés des boutons "Ajouter"
var ADD_BUTTON_PATTERNS = [
  "ajouter",
  "ajouter une ligne",
  "ajouter un element",
  "ajouter un élément",
  "add",
  "+ ajouter",
  "add entry",
  "add row",
  "add experience",
  "add education",
  "ajouter une expérience",
  "ajouter une formation",
  "nouvelle entrée",
  "new entry",
  "create new",
  "creer",
  "créer",
];

// ─── Sous-champs par section ──────────────────────────────────────────────────

var EXPERIENCE_SUBFIELDS = {
  poste: [
    "poste",
    "rôle",
    "role",
    "titre du poste",
    "intitulé du poste",
    "fonction",
    "job title",
    "position",
    "title",
    "designation",
  ],
  entreprise: [
    "entreprise",
    "société",
    "societe",
    "nom de la société",
    "nom de la societe",
    "nom de l entreprise",
    "employeur",
    "company",
    "employer",
    "organization",
    "organisation",
    "company name",
  ],
  date_debut: [
    "date de début",
    "date debut",
    "début",
    "début d emploi",
    "start date",
    "from",
    "date from",
    "employment start",
  ],
  date_fin: [
    "date de fin",
    "date fin",
    "fin",
    "fin d emploi",
    "end date",
    "to",
    "date to",
    "employment end",
    "jusqu à",
  ],
  lieu: [
    "lieu",
    "ville",
    "localisation",
    "lieu de travail",
    "location",
    "city",
    "work location",
  ],
  description: [
    "description",
    "missions",
    "responsabilités",
    "tâches",
    "description du poste",
    "détails",
    "description",
    "responsibilities",
    "duties",
    "achievements",
    "summary",
  ],
  employeur_actuel: [
    "employeur actuel",
    "poste actuel",
    "current employer",
    "currently employed",
    "current position",
    "est ce votre emploi actuel",
  ],
};

var FORMATION_SUBFIELDS = {
  nom_formation: [
    "nom de la formation",
    "nom formation",
    "intitule de la formation",
    "titre de la formation",
    "formation name",
    "program name",
  ],
  diplome: [
    "diplôme",
    "diplome",
    "titre",
    "niveau d études",
    "niveau d etude",
    "niveau d'etude",
    "qualification",
    "degree",
    "certificate",
    "award",
    "degree type",
  ],
  diplome_plus_eleve: [
    "s agit il de votre diplome le plus eleve",
    "diplome le plus eleve",
    "highest degree",
    "highest qualification",
  ],
  etablissement: [
    "établissement",
    "ecole",
    "école",
    "université",
    "universite",
    "ecole universite institut de formation",
    "institution",
    "school",
    "university",
    "college",
    "institute",
  ],
  annee_obtention: [
    "année d obtention",
    "annee",
    "date d obtention",
    "date d obtention du diplome",
    "année de fin",
    "graduation year",
    "year of graduation",
    "end date",
    "completion year",
    "completion date",
  ],
  domaine: [
    "domaine",
    "domaine d etude",
    "domaine d'etude",
    "spécialité",
    "filière",
    "mention",
    "matière principale",
    "field of study",
    "major",
    "subject",
    "discipline",
    "specialization",
  ],
  country_education: [
    "country of education",
    "pays de formation",
    "pays d education",
  ],
};

// ─── Fonctions utilitaires ────────────────────────────────────────────────────

/**
 * Trouve une section par son titre dans la page.
 * @param {'experience'|'formation'} type
 * @returns {Element|null}
 */
function findSection(type) {
  var patterns = SECTION_PATTERNS[type].map(normalize);
  var headings = Array.from(
    document.querySelectorAll(
      'h1, h2, h3, h4, h5, legend, summary, ' +
        '[class*="section"], [class*="header"], [class*="heading"], [class*="title"], ' +
        '[class*="panel-heading"], [class*="acc-header"], [class*="accordion"], ' +
        '[role="heading"], [role="tab"]',
    ),
  );

  var best = null;
  var bestLen = Infinity;

  for (var i = 0; i < headings.length; i++) {
    var raw = (headings[i].innerText || headings[i].textContent || "").substring(0, 200);
    var text = normalize(raw);
    if (!text) continue;
    for (var j = 0; j < patterns.length; j++) {
      if (text.includes(patterns[j])) {
        // Privilégier le candidat dont le texte est le plus court (= header pur,
        // pas un parent qui englobe toute la section)
        if (text.length < bestLen) {
          best = headings[i];
          bestLen = text.length;
        }
        break;
      }
    }
  }
  return best;
}

/**
 * Trouve le bouton "Ajouter" le plus proche d'un élément section.
 * Stratégie large : cherche dans toute la page en partant du header de section.
 * @param {Element} sectionEl
 * @returns {Element|null}
 */
function findAddButton(sectionEl) {
  var patterns = ADD_BUTTON_PATTERNS.map(normalize);

  /**
   * Teste si un élément est un bouton "Ajouter".
   * Vérifie texte, aria-label, title, value (input), et data-action.
   */
  function isAddBtn(el) {
    var sources = [
      el.innerText || el.textContent || "",
      el.getAttribute("aria-label") || "",
      el.getAttribute("title") || "",
      el.getAttribute("value") || "",          // <input type="button" value="Ajouter">
      el.getAttribute("data-action") || "",
      el.getAttribute("data-automation-id") || "",
      el.getAttribute("name") || "",
    ];
    for (var s = 0; s < sources.length; s++) {
      var norm = normalize(sources[s]);
      if (!norm) continue;
      for (var j = 0; j < patterns.length; j++) {
        if (norm.includes(patterns[j])) return true;
      }
    }
    return false;
  }

  // Sélecteur étendu : SF (addRowButton), Taleo (ftl-add-link, add-link),
  // Workday (data-automation-id) et inputs button/submit/image.
  var BTN_SELECTOR =
    'button, a, [role="button"], ' +
    'input[type="button"], input[type="submit"], input[type="image"], ' +
    'span[onclick], div[onclick], li[onclick], i[onclick], ' +
    '.addRowButton, [class*="addRow"], [id*="addRow"], ' +
    '[class*="add-link"], [class*="addLink"], [class*="ftl-add"], ' +
    '[data-action*="add"], [data-automation-id*="add"]';

  // 1. Chercher dans le parent immédiat (5 niveaux)
  var parent = sectionEl.parentElement;
  for (var level = 0; level < 5 && parent; level++) {
    var btns = Array.from(parent.querySelectorAll(BTN_SELECTOR));
    for (var i = 0; i < btns.length; i++) {
      if (isAddBtn(btns[i])) {
        Logger.debug("Bouton Ajouter trouvé (parent lvl " + level + "): " + (btns[i].title || btns[i].innerText || "").substring(0, 40));
        return btns[i];
      }
    }
    parent = parent.parentElement;
  }

  // 2. Chercher dans les frères suivants (contenu de l'accordéon ouvert)
  var sibling = sectionEl.nextElementSibling;
  var maxSib = 15;
  while (sibling && maxSib-- > 0) {
    if (isAddBtn(sibling)) return sibling;
    var sibBtns = Array.from(sibling.querySelectorAll(BTN_SELECTOR));
    for (var k = 0; k < sibBtns.length; k++) {
      if (isAddBtn(sibBtns[k])) {
        Logger.debug("Bouton Ajouter trouvé (sibling): " + (sibBtns[k].title || sibBtns[k].innerText || "").substring(0, 40));
        return sibBtns[k];
      }
    }
    sibling = sibling.nextElementSibling;
  }

  // 3. Fallback global : chercher dans toute la page le bouton "Ajouter"
  //    visible le plus proche du sectionEl (par position DOM)
  var allBtns = Array.from(document.querySelectorAll(BTN_SELECTOR));
  var sectionRect = sectionEl.getBoundingClientRect();

  var candidates = allBtns.filter(isAddBtn);
  if (candidates.length === 0) return null;

  // Trier par proximité verticale avec le header de section
  candidates.sort(function (a, b) {
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    return (
      Math.abs(ra.top - sectionRect.bottom) -
      Math.abs(rb.top - sectionRect.bottom)
    );
  });

  // Ne retourner que si c'est en dessous du header
  var best = candidates[0];
  var bestRect = best.getBoundingClientRect();
  if (bestRect.top >= sectionRect.top) return best;

  return null;
}

/**
 * Après avoir cliqué sur "Ajouter", attend que de nouveaux champs apparaissent.
 * Combine : (1) MutationObserver pour réagir dès qu'un input est ajouté,
 *           (2) timeout de sécurité, (3) attente minimale pour laisser l'animation finir.
 *
 * @param {number} timeoutMs
 * @param {Element} [scope] - racine d'observation (défaut : document.body)
 * @returns {Promise<void>}
 */
function waitForNewFields(timeoutMs, scope) {
  timeoutMs = timeoutMs || 2500;
  scope = scope || document.body;

  return new Promise(function (resolve) {
    var initialCount = scope.querySelectorAll(
      'input:not([type="hidden"]), textarea, select'
    ).length;

    var resolved = false;
    function finish() {
      if (resolved) return;
      resolved = true;
      try { observer.disconnect(); } catch (_) {}
      // Petit délai supplémentaire pour les animations CSS et le rendu
      setTimeout(resolve, 200);
    }

    var observer = new MutationObserver(function () {
      var current = scope.querySelectorAll(
        'input:not([type="hidden"]), textarea, select'
      ).length;
      // Aussi déclencher si un modal/dialog vient d'apparaître
      var dialog = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
      if (current > initialCount || (dialog && dialog.querySelector('input, textarea, select'))) {
        finish();
      }
    });
    observer.observe(scope, { childList: true, subtree: true, attributes: true });

    setTimeout(finish, timeoutMs);
  });
}

/**
 * Remplit les sous-champs d'un formulaire dynamique apparu après "Ajouter".
 * @param {Element} container - Zone de formulaire dans laquelle chercher les champs
 * @param {Object} subfields - Dictionnaire { key: [keywords] }
 * @param {Object} values    - Dictionnaire { key: valeur }
 */
async function fillSubfields(container, subfields, values) {
  var inputs = Array.from(
    container.querySelectorAll('input:not([type="hidden"]), textarea, select'),
  );
  var filled = 0;
  var DATE_KEYS = ["date_debut", "date_fin", "annee_obtention"];

  for (var i = 0; i < inputs.length; i++) {
    var el = inputs[i];
    if (shouldIgnore(el)) continue;

    var fieldKey = detectSubfieldType(el, subfields);
    if (!fieldKey || !values[fieldKey]) continue;

    var value = values[fieldKey];

    try {
      if (el.tagName === "SELECT") {
        fillSelectField(el, value);
      } else if (el.tagName === "TEXTAREA") {
        fillTextareaField(el, value);
      } else if (DATE_KEYS.indexOf(fieldKey) !== -1 || isDateField(el)) {
        if (window.DateHandler) {
          await DateHandler.fill(el, value);
        } else {
          await fillDateField(el, value);
        }
      } else {
        fillInputField(el, value);
      }
      showFieldFeedback(el);
      filled++;
    } catch (err) {
      Logger.error("Erreur remplissage sous-champ " + fieldKey, err);
    }
  }

  return filled;
}

/**
 * Détecte le type de sous-champ parmi un dictionnaire donné.
 * @param {Element} el
 * @param {Object} subfields
 * @returns {string|null}
 */
function detectSubfieldType(el, subfields) {
  var candidates = [
    el.getAttribute("name") || "",
    el.getAttribute("id") || "",
    el.getAttribute("placeholder") || "",
    el.getAttribute("aria-label") || "",
    el.getAttribute("data-label") || "",
  ];

  var id = el.getAttribute("id");
  if (id) {
    try {
      var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (label) candidates.push(label.innerText || "");
    } catch (_) {}
  }

  var parentLabel = el.closest("label");
  if (parentLabel) {
    var clone = parentLabel.cloneNode(true);
    clone.querySelectorAll("input, select, textarea").forEach(function (c) {
      c.remove();
    });
    candidates.push(clone.innerText || "");
  }

  var parent = el.parentElement;
  if (parent) {
    var clone2 = parent.cloneNode(true);
    clone2.querySelectorAll("input, select, textarea").forEach(function (c) {
      c.remove();
    });
    candidates.push((clone2.innerText || "").split("\n")[0]);
  }

  var normalizedCandidates = candidates.map(normalize).filter(Boolean);
  var keys = Object.keys(subfields);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var keywords = subfields[key].map(normalize);
    for (var j = 0; j < normalizedCandidates.length; j++) {
      var cand = normalizedCandidates[j];
      for (var k = 0; k < keywords.length; k++) {
        if (cand === keywords[k] || cand.includes(keywords[k])) {
          return key;
        }
      }
    }
  }

  return null;
}

// ─── Remplissage principal des sections dynamiques ───────────────────────────

/**
 * Remplit les expériences professionnelles en cliquant sur "Ajouter"
 * pour chaque entrée du profil.
 *
 * @param {Object} profil
 * @returns {Promise<number>} nombre d'expériences ajoutées
 */
async function fillExperienceSections(profil) {
  var experiences = profil.experiences || [];
  if (experiences.length === 0) return 0;

  // 1. Ouvrir l'accordéon si nécessaire (SuccessFactors, etc.)
  var sectionEl = await expandSection("experience");
  // Fallback : chercher le heading classique
  if (!sectionEl) sectionEl = findSection("experience");
  if (!sectionEl) {
    Logger.log("Section expérience non trouvée sur cette page");
    return 0;
  }

  var added = 0;

  // Vérifier s'il y a déjà un formulaire vide existant (SF pré-crée souvent une entrée)
  var existingContainer = findLatestDynamicForm(sectionEl);
  var hasExistingEmpty = false;
  if (existingContainer) {
    var existingInputs = Array.from(
      existingContainer.querySelectorAll('input:not([type="hidden"]), textarea, select')
    ).filter(function (el) { return !shouldIgnore(el); });
    var emptyCount = existingInputs.filter(function (el) {
      if (el.tagName === "SELECT") {
        var opt = el.options && el.options[el.selectedIndex];
        var txt = opt ? (opt.text || "").toLowerCase() : "";
        return !el.value || txt.includes("aucune") || txt.includes("select");
      }
      return !el.value || el.value.trim() === "";
    }).length;
    hasExistingEmpty = emptyCount >= 2; // Au moins 2 champs vides → formulaire vide
  }

  for (var i = 0; i < experiences.length; i++) {
    var exp = experiences[i];
    if (!exp.poste && !exp.entreprise) continue;

    var container;

    if (i === 0 && hasExistingEmpty && existingContainer) {
      // Première expérience : remplir le formulaire déjà visible
      container = existingContainer;
      Logger.log("Formulaire expérience existant trouvé, remplissage direct");
    } else {
      var addBtn = findAddButton(sectionEl);
      if (!addBtn) {
        Logger.warn("Bouton Ajouter (expérience) non trouvé");
        break;
      }

      // Clic robuste pour SF (juic.fire, etc.)
      Logger.debug("Clic sur Ajouter (exp): " + (addBtn.title || addBtn.innerText || "").substring(0, 40));
      addBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      addBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      addBtn.click();
      await waitForNewFields(2500);

      container = findLatestDynamicForm(sectionEl);
      if (!container) {
        Logger.warn("Container du formulaire expérience non trouvé");
        continue;
      }
    }

    var values = {
      poste: exp.poste || "",
      entreprise: exp.entreprise || "",
      date_debut: exp.dateDebut || "",
      date_fin: exp.dateFin || "",
      lieu: exp.lieu || "",
      description: exp.description || "",
      employeur_actuel: exp.actuel ? "Oui" : "Non",
    };

    var filled = await fillSubfields(container, EXPERIENCE_SUBFIELDS, values);
    Logger.log("Expérience : " + filled + " champ(s) rempli(s)");
    added++;
  }

  Logger.log(added + " expérience(s) ajoutée(s)");
  return added;
}

/**
 * Remplit les formations en cliquant sur "Ajouter" pour chaque entrée du profil.
 *
 * @param {Object} profil
 * @returns {Promise<number>} nombre de formations ajoutées
 */
async function fillFormationSections(profil) {
  var formations = profil.formations || [];
  if (formations.length === 0) return 0;

  // 1. Ouvrir les deux accordéons (parcours académique + formations et certifications)
  var sectionEl = await expandSection("formation");
  if (!sectionEl) sectionEl = findSection("formation");
  if (!sectionEl) {
    Logger.log("Section formation non trouvée sur cette page");
    return 0;
  }

  var added = 0;

  for (var i = 0; i < formations.length; i++) {
    var form = formations[i];
    if (!form.diplome && !form.etablissement && !form.niveauEtudes && !form.mention) continue;

    var addBtn = findAddButton(sectionEl);
    if (!addBtn) {
      Logger.warn("Bouton Ajouter (formation) non trouvé");
      break;
    }

    // Clic robuste pour SF (juic.fire, etc.)
    Logger.debug("Clic sur Ajouter (formation): " + (addBtn.title || addBtn.innerText || "").substring(0, 40));
    addBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    addBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    addBtn.click();
    await waitForNewFields(2500);

    var container = findLatestDynamicForm(sectionEl);
    if (!container) continue;

    var values = {
      nom_formation: form.diplome || form.niveauEtudes || "",
      diplome: form.niveauEtudes || form.diplome || "",
      diplome_plus_eleve: form.niveauEtudes || form.diplome || "",
      etablissement: form.etablissement || "",
      annee_obtention: form.annee || form.dateFin || "",
      domaine: form.mention || "",
      country_education: "France",
    };

    await fillSubfields(container, FORMATION_SUBFIELDS, values);
    added++;
  }

  Logger.log(added + " formation(s) ajoutée(s)");
  return added;
}

/**
 * Trouve le formulaire dynamique le plus récemment apparu dans la zone d'une section.
 * Stratégie : cherche le dernier groupe de champs visible après le heading de section.
 *
 * @param {Element} sectionEl
 * @returns {Element|null}
 */
function findLatestDynamicForm(sectionEl) {
  // 1. Cas modal : certains ATS (Taleo, Workday, Capgemini) ouvrent un
  //    <div role="dialog"> ou .modal après le clic Ajouter.
  var openDialog = document.querySelector(
    '[role="dialog"]:not([aria-hidden="true"]), ' +
    '.modal.in, .modal.show, [class*="modal"][style*="display: block"], ' +
    '[class*="popup"]:not([aria-hidden="true"]), [class*="overlay"][aria-modal="true"]'
  );
  if (openDialog && openDialog.querySelector('input, select, textarea')) {
    return openDialog;
  }

  var container =
    sectionEl.closest('section, fieldset, [class*="section"], details') ||
    sectionEl.parentElement;
  if (!container) return null;

  // 2. Chercher tous les containers de formulaire dans la section
  var formContainers = Array.from(
    container.querySelectorAll(
      'fieldset, [class*="form-group"], [class*="entry"], [class*="item"], ' +
      '[class*="row"], [class*="record"], [class*="block"], ' +
      'div[data-automation-id], li[class*="entry"]',
    ),
  ).filter(function (el) {
    // Garder uniquement les containers qui ont au moins 1 input visible
    return el.querySelector('input:not([type="hidden"]), textarea, select') !== null;
  });

  // 3. Retourner le dernier (le plus récemment ajouté)
  if (formContainers.length > 0) {
    return formContainers[formContainers.length - 1];
  }

  return container;
}
