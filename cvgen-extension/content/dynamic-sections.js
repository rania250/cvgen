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
function findAddButton(sectionEl, expectedType) {
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

  // ── Filtre par type attendu (utilisé seulement si expectedType passé) ──
  // SuccessFactors marque chaque addRowButton avec :
  //   <span class="hiddenAriaContent" aria-label="Expérience professionnelle">
  // On peut donc filtrer par le aria-label du span caché.
  var typePatterns = (expectedType && SECTION_PATTERNS[expectedType])
    ? SECTION_PATTERNS[expectedType].map(normalize)
    : null;

  function matchesType(btn) {
    if (!typePatterns) return true;
    var sources = [];
    // SF : hiddenAriaContent enfant
    var hidden = btn.querySelector('.hiddenAriaContent, [class*="hiddenAria"]');
    if (hidden) {
      sources.push(hidden.getAttribute('aria-label') || hidden.innerText || '');
    }
    // Aria/title/text du bouton lui-même
    sources.push(btn.getAttribute('aria-label') || '');
    sources.push(btn.getAttribute('title') || '');
    // Texte du parent proche (ex: "Ajouter" + heading section voisin)
    if (btn.parentElement) {
      sources.push((btn.parentElement.innerText || '').substring(0, 150));
    }

    for (var s = 0; s < sources.length; s++) {
      var norm = normalize(sources[s]);
      if (!norm) continue;
      for (var p = 0; p < typePatterns.length; p++) {
        if (norm.includes(typePatterns[p])) return true;
      }
    }
    return false;
  }

  function isAddBtnTyped(el) {
    return isAddBtn(el) && matchesType(el);
  }

  // 1. Si typePatterns est défini : recherche GLOBALE filtrée par type
  //    (prioritaire car plus fiable que la proximité DOM)
  if (typePatterns) {
    var allBtnsGlobal = Array.from(document.querySelectorAll(BTN_SELECTOR));
    var typedCandidates = allBtnsGlobal.filter(isAddBtnTyped);
    if (typedCandidates.length > 0) {
      Logger.debug(
        "Bouton Ajouter trouvé par type '" + expectedType +
        "' (" + typedCandidates.length + " candidat·s)"
      );
      return typedCandidates[0];
    }
    Logger.debug("Aucun bouton 'Ajouter' typé '" + expectedType + "' — fallback proximité");
  }

  // 2. Chercher dans le parent immédiat (5 niveaux)
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

  // 3. Chercher dans les frères suivants (contenu de l'accordéon ouvert)
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

  // 4. Fallback global non-typé : proximité verticale avec le header
  var allBtns = Array.from(document.querySelectorAll(BTN_SELECTOR));
  var sectionRect = sectionEl.getBoundingClientRect();
  var candidates = allBtns.filter(isAddBtn);
  if (candidates.length === 0) return null;

  candidates.sort(function (a, b) {
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    return (
      Math.abs(ra.top - sectionRect.bottom) -
      Math.abs(rb.top - sectionRect.bottom)
    );
  });

  var best = candidates[0];
  var bestRect = best.getBoundingClientRect();
  if (bestRect.top >= sectionRect.top) return best;
  return null;
}

/**
 * Trouve l'élément vraiment "cliquable" à partir d'un wrapper.
 * Beaucoup d'ATS (SuccessFactors notamment) utilisent un wrapper
 * <div class="addRowButton"> qui contient le vrai bouton interactif
 * (<a>, <button>, [onclick], [role="button"]). Le handler étant sur
 * l'enfant, un clic sur le div ne déclenche rien.
 */
function resolveClickable(el) {
  if (!el) return null;
  var INTERACTIVE = ["A", "BUTTON", "INPUT", "SUMMARY"];
  if (INTERACTIVE.indexOf(el.tagName) !== -1) return el;
  if (el.hasAttribute("onclick")) return el;
  if (el.getAttribute("role") === "button") return el;
  if (el.getAttribute("tabindex") !== null) return el;
  // Chercher le premier descendant interactif (5 niveaux max)
  var child = el.querySelector('a, button, input[type="button"], [onclick], [role="button"], [tabindex]');
  return child || el;
}

/**
 * Clic robuste compatible SuccessFactors / Taleo / Workday.
 * Résout d'abord l'élément vraiment cliquable (cas wrapper div) puis
 * dispatche la séquence complète Pointer + Mouse + Touch + native click().
 *
 * @param {Element} el
 */
/**
 * Injecte et exécute du code JavaScript dans le MAIN world de la page
 * (le contexte où vivent les libs custom du site comme juic, jQuery, etc.).
 * Le content script tourne dans un "isolated world" et n'a pas accès à ces
 * libs. Pour déclencher onclick="juic.fire(...)", on doit passer par là.
 *
 * Limite : si la page a une CSP stricte (`script-src 'self'`), cette
 * injection est bloquée silencieusement.
 *
 * @param {string} code - JS à exécuter, sera évalué dans le main world.
 */
function execInMainWorld(code) {
  try {
    var script = document.createElement("script");
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
    return true;
  } catch (err) {
    Logger.warn("Injection main world échouée : " + err.message);
    return false;
  }
}

/**
 * Échappe une chaîne pour insertion sûre dans un littéral string JS.
 */
function jsStringLit(s) {
  return JSON.stringify(String(s == null ? "" : s));
}

function clickElementRobust(el) {
  if (!el) return;

  var innerHTMLShort = (el.innerHTML || "").replace(/\s+/g, " ").substring(0, 200);
  Logger.log("Structure du bouton : " + innerHTMLShort);

  var target = resolveClickable(el);
  if (target !== el) {
    Logger.log(
      "Clic redirigé vers <" + target.tagName.toLowerCase() +
      " class='" + (target.className || "").substring(0, 40) + "'>"
    );
  }

  // Détecter onclick juic/sap pour stratégie B
  var onclickAttr =
    target.getAttribute("onclick") ||
    el.getAttribute("onclick") ||
    "";
  if (!onclickAttr) {
    var p = target.parentElement;
    for (var pi = 0; pi < 3 && p; pi++) {
      var oc = p.getAttribute("onclick");
      if (oc) { onclickAttr = oc; break; }
      p = p.parentElement;
    }
  }
  var btnId = target.id || el.id || "";
  var needMainWorld =
    onclickAttr.indexOf("juic") !== -1 ||
    onclickAttr.indexOf("sap.") !== -1 ||
    onclickAttr.indexOf("addRow") !== -1;

  // ── Stratégie A : UN SEUL click synthétique ──
  // On limite à un seul event "click" pour éviter de déclencher juic.fire
  // plusieurs fois (onkeydown, onkeyup et onclick appellent souvent la même
  // fonction → multiples Pointer/Mouse/Keyboard = multiples ajouts).
  try {
    target.focus();
    target.dispatchEvent(new MouseEvent("click", {
      bubbles: true, cancelable: true, view: window,
    }));
  } catch (err) {
    Logger.warn("Stratégie A (click) a échoué : " + err.message);
  }

  // ── Stratégie B : main world click pour SAP/SuccessFactors ──
  // Indispensable car juic.fire peut filtrer les events isTrusted=false
  // depuis l'isolated world des content scripts.
  if (needMainWorld) {
    if (btnId) {
      Logger.log("Stratégie B : exécution dans le main world (juic.fire détecté)");
      execInMainWorld(
        "(function(){try{" +
          "var b=document.getElementById(" + jsStringLit(btnId) + ");" +
          "if(b){b.focus();b.click();}" +
        "}catch(e){console.warn('[CVGen MAIN] click failed',e);}}())"
      );
    } else {
      Logger.log("Stratégie B : éval du onclick inline (pas d'id)");
      execInMainWorld(
        "(function(){try{(function(event){" + onclickAttr + "})(new MouseEvent('click'));}" +
        "catch(e){console.warn('[CVGen MAIN] onclick eval failed',e);}}())"
      );
    }
  }
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

  // Sanity check : ne jamais créer plus de 10 entrées (anti-boucle si données corrompues)
  if (experiences.length > 10) {
    Logger.warn("Profil contient " + experiences.length + " expériences, plafonné à 10");
    experiences = experiences.slice(0, 10);
  }

  // 1. Ouvrir l'accordéon si nécessaire (SuccessFactors, etc.)
  var sectionEl = await expandSection("experience");
  if (!sectionEl) sectionEl = findSection("experience");
  if (!sectionEl) {
    Logger.log("Section expérience non trouvée sur cette page");
    return 0;
  }

  // 2. Compter les containers d'entrées DÉJÀ présents pour cette section
  //    afin de ne pas en recréer si l'utilisateur a déjà cliqué Remplir.
  var existingContainers = findAllDynamicContainers(sectionEl);
  Logger.log(
    "Section expérience : " + existingContainers.length +
    " entrée(s) existante(s), profil = " + experiences.length + " exp."
  );

  var added = 0;

  for (var i = 0; i < experiences.length; i++) {
    var exp = experiences[i];
    if (!exp.poste && !exp.entreprise) continue;

    var container;

    if (i < existingContainers.length) {
      // Réutiliser une entrée déjà présente (vide ou pré-remplie d'un essai précédent)
      container = existingContainers[i];
      Logger.log("Expérience #" + (i + 1) + " : réutilisation entrée existante");
    } else {
      // Cliquer Ajouter pour créer une nouvelle entrée
      var addBtn = findAddButton(sectionEl, "experience");
      if (!addBtn) {
        Logger.warn("Bouton Ajouter (expérience) non trouvé");
        break;
      }

      var beforeSnapshot = snapshotInputs();
      Logger.log(
        "Clic Ajouter exp #" + (i + 1) + " sur <" + addBtn.tagName.toLowerCase() +
        " class='" + (addBtn.className || "").substring(0, 60) + "'>"
      );
      clickElementRobust(addBtn);
      await waitForNewFields(3500);

      var newContainer = findContainerOfNewInputs(beforeSnapshot);
      if (!newContainer) {
        Logger.warn("Clic Ajouter exp n'a créé aucun nouvel input — arrêt");
        break;
      }
      Logger.log(
        "Nouveau container expérience : <" + newContainer.tagName.toLowerCase() +
        " class='" + (newContainer.className || "").substring(0, 60) + "'> avec " +
        newContainer.querySelectorAll('input:not([type="hidden"]), textarea, select').length + " input(s)"
      );
      container = newContainer;
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
    Logger.log("Expérience #" + (i + 1) + " : " + filled + " champ(s) rempli(s)");
    added++;
  }

  Logger.log(added + " expérience(s) traitée(s)");
  return added;
}

/**
 * Snapshot des inputs visibles de la page à un instant T.
 * @returns {Set<Element>}
 */
function snapshotInputs() {
  var set = new Set();
  var nodes = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
  for (var i = 0; i < nodes.length; i++) set.add(nodes[i]);
  return set;
}

/**
 * Compare le DOM avant/après un clic Ajouter et retourne le container
 * qui regroupe les inputs de la NOUVELLE entrée uniquement.
 *
 * Stratégie :
 *  1. Calcule le LCA (Least Common Ancestor) des nouveaux inputs
 *  2. Compte les boutons "Supprimer/Delete/Remove" dans ce LCA :
 *     - Si ≤ 1 → c'est une entrée unique → retourne le LCA
 *     - Si ≥ 2 → le LCA englobe plusieurs entrées (cas re-render fréquent
 *       sur SuccessFactors qui re-render toute la section à chaque clic).
 *       Retourne le container parent du DERNIER bouton Supprimer.
 *
 * @param {Set<Element>} beforeSet - snapshot d'avant clic (snapshotInputs())
 * @returns {Element|null}
 */
function findContainerOfNewInputs(beforeSet) {
  var nowInputs = Array.from(
    document.querySelectorAll('input:not([type="hidden"]), textarea, select')
  );
  var newInputs = nowInputs.filter(function (el) { return !beforeSet.has(el); });

  if (newInputs.length === 0) return null;

  // LCA des nouveaux inputs
  var firstChain = [];
  var node = newInputs[0];
  while (node && node !== document.body) {
    firstChain.push(node);
    node = node.parentElement;
  }
  var lca = null;
  for (var i = 0; i < firstChain.length; i++) {
    var candidate = firstChain[i];
    var containsAll = true;
    for (var j = 1; j < newInputs.length; j++) {
      if (!candidate.contains(newInputs[j])) {
        containsAll = false;
        break;
      }
    }
    if (containsAll) { lca = candidate; break; }
  }
  if (!lca) return null;

  // Détecter combien d'entrées le LCA contient via les boutons "Supprimer"
  var deleteBtns = findDeleteButtons(lca);

  if (deleteBtns.length <= 1) {
    return lca;
  }

  Logger.log(
    "LCA contient " + deleteBtns.length + " boutons Supprimer (= " +
    deleteBtns.length + " entrées) — on isole la dernière"
  );

  // Trouve le container parent du DERNIER Supprimer qui contient des inputs
  // et qui ne contient AUCUN autre bouton Supprimer.
  var lastDelete = deleteBtns[deleteBtns.length - 1];
  var container = lastDelete.parentElement;
  while (container && container !== lca && container !== document.body) {
    var hasInputs = container.querySelector(
      'input:not([type="hidden"]), textarea, select'
    );
    if (hasInputs) {
      var otherDeletes = findDeleteButtons(container).filter(function (b) {
        return b !== lastDelete;
      });
      if (otherDeletes.length === 0) {
        return container;
      }
    }
    container = container.parentElement;
  }
  return lca;
}

/**
 * Trouve les boutons/liens "Supprimer/Delete/Remove/Retirer" dans un parent.
 * @param {Element} parent
 * @returns {Element[]}
 */
function findDeleteButtons(parent) {
  var candidates = Array.from(
    parent.querySelectorAll(
      'a, button, [role="button"], div[onclick], span[onclick], ' +
      '[class*="delete"], [class*="remove"], [class*="trash"]'
    )
  );
  return candidates.filter(function (el) {
    var text = (el.textContent || "").toLowerCase().trim();
    var aria = (el.getAttribute("aria-label") || "").toLowerCase();
    var title = (el.getAttribute("title") || "").toLowerCase();
    var blob = text + " " + aria + " " + title;
    return /(\bsupprim|\bdelete|\bremove|\bretirer|\beffacer)/i.test(blob);
  });
}

/**
 * Retourne TOUS les containers d'entrées (records) déjà présents dans une section
 * dynamique (utile pour ne pas en recréer si l'utilisateur a cliqué Remplir 2 fois).
 *
 * Stratégie en 2 passes :
 *  1. Compter les boutons "Supprimer/Delete/🗑" — chaque entrée en a un.
 *     Remonter à l'ancêtre commun qui contient au moins 1 input.
 *  2. Si la passe 1 ne donne rien, fallback sur les sélecteurs de classes.
 *
 * @param {Element} sectionEl
 * @returns {Element[]}
 */
function findAllDynamicContainers(sectionEl) {
  var scope =
    sectionEl.closest('section, fieldset, [class*="section"], details') ||
    sectionEl.parentElement;
  if (!scope) return [];

  // ── Passe 1 : via les boutons Supprimer (très fiable sur Taleo/SF) ────────
  var deletePatterns = [
    "supprimer", "delete", "remove", "retirer", "enlever",
  ];
  var deleteBtns = Array.from(
    scope.querySelectorAll('button, a, [role="button"], i, span, [class*="delete"], [class*="remove"], [class*="trash"]')
  ).filter(function (el) {
    var t = normalize(el.innerText || el.textContent || "");
    var a = normalize(el.getAttribute("aria-label") || "");
    var ti = normalize(el.getAttribute("title") || "");
    for (var p = 0; p < deletePatterns.length; p++) {
      if (t === deletePatterns[p] || a.includes(deletePatterns[p]) || ti.includes(deletePatterns[p])) {
        return true;
      }
    }
    return false;
  });

  var byDelete = [];
  for (var d = 0; d < deleteBtns.length; d++) {
    // Remonter aux 6 niveaux pour trouver le container qui possède au moins
    // 1 input visible, sans être le scope global de la section.
    var parent = deleteBtns[d].parentElement;
    for (var lvl = 0; lvl < 6 && parent; lvl++) {
      if (parent === scope) break;
      var hasInput = parent.querySelector('input:not([type="hidden"]), textarea, select');
      if (hasInput && byDelete.indexOf(parent) === -1) {
        byDelete.push(parent);
        break;
      }
      parent = parent.parentElement;
    }
  }
  if (byDelete.length > 0) return byDelete;

  // ── Passe 2 : fallback par sélecteurs de classes ──────────────────────────
  var found = Array.from(
    scope.querySelectorAll(
      'fieldset, [class*="entry"], [class*="record"], [class*="item-row"], ' +
      '[class*="ftl-record"], [class*="ftl-row"], [class*="experience-block"], ' +
      'li[class*="item"], div[data-automation-id*="formField"]'
    )
  ).filter(function (el) {
    return el.querySelector('input:not([type="hidden"]), textarea, select') !== null;
  });
  return found;
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

  // Sanity check anti-boucle
  if (formations.length > 10) {
    Logger.warn("Profil contient " + formations.length + " formations, plafonné à 10");
    formations = formations.slice(0, 10);
  }

  // 1. Ouvrir les deux accordéons (parcours académique + formations et certifications)
  var sectionEl = await expandSection("formation");
  if (!sectionEl) sectionEl = findSection("formation");
  if (!sectionEl) {
    Logger.log("Section formation non trouvée sur cette page");
    return 0;
  }

  // Compter les entrées formation déjà présentes pour ne pas en recréer
  var existingFormContainers = findAllDynamicContainers(sectionEl);
  Logger.log(
    "Section formation : " + existingFormContainers.length +
    " entrée(s) existante(s), profil = " + formations.length + " formation(s)."
  );

  var added = 0;

  for (var i = 0; i < formations.length; i++) {
    var form = formations[i];
    if (!form.diplome && !form.etablissement && !form.niveauEtudes && !form.mention) continue;

    var container;

    if (i < existingFormContainers.length) {
      container = existingFormContainers[i];
      Logger.log("Formation #" + (i + 1) + " : réutilisation entrée existante");
    } else {
      var addBtn = findAddButton(sectionEl, "formation");
      if (!addBtn) {
        Logger.warn("Bouton Ajouter (formation) non trouvé");
        break;
      }

      var beforeSnapshot = snapshotInputs();
      Logger.log(
        "Clic Ajouter formation #" + (i + 1) + " sur <" + addBtn.tagName.toLowerCase() +
        " class='" + (addBtn.className || "").substring(0, 60) + "'>"
      );
      clickElementRobust(addBtn);
      await waitForNewFields(3500);

      var newContainer = findContainerOfNewInputs(beforeSnapshot);
      if (!newContainer) {
        Logger.warn("Clic Ajouter formation n'a créé aucun nouvel input — arrêt");
        break;
      }
      Logger.log(
        "Nouveau container formation : <" + newContainer.tagName.toLowerCase() +
        " class='" + (newContainer.className || "").substring(0, 60) + "'> avec " +
        newContainer.querySelectorAll('input:not([type="hidden"]), textarea, select').length + " input(s)"
      );
      container = newContainer;
    }

    var values = {
      nom_formation: form.diplome || form.niveauEtudes || "",
      diplome: form.niveauEtudes || form.diplome || "",
      diplome_plus_eleve: form.niveauEtudes || form.diplome || "",
      etablissement: form.etablissement || "",
      annee_obtention: form.annee || form.dateFin || "",
      domaine: form.mention || "",
      country_education: "France",
    };

    var filled = await fillSubfields(container, FORMATION_SUBFIELDS, values);
    Logger.log("Formation #" + (i + 1) + " : " + filled + " champ(s) rempli(s)");
    added++;
  }

  Logger.log(added + " formation(s) traitée(s)");
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
