/**
 * CVGen Dynamic Sections Filler
 * Remplit les sections dynamiques des formulaires (Expériences, Formations)
 * en cliquant sur les boutons "Ajouter" puis en remplissant les sous-champs.
 *
 * Compatible SuccessFactors (accordéons), Workday, Taleo, SmartRecruiters.
 */

// ─── Helpers Shadow DOM ───────────────────────────────────────────────────────

/**
 * querySelectorAll qui traverse récursivement les Shadow DOM (open).
 * Indispensable pour SmartRecruiters (Web Components SPL), Workday, etc.
 */
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

// ─── Détecteurs de sections ───────────────────────────────────────────────────

var SECTION_PATTERNS = {
  experience: [
    "expérience professionnelle",
    "experience professionnelle",
    "expériences professionnelles",
    "expériences",
    "expérience",
    "experience",
    "parcours professionnel",
    "historique professionnel",
    "work experience",
    "employment history",
    "professional experience",
    "work history",
    "career history",
  ],
  formation: [
    "parcours académique",
    "parcours academique",
    "niveau d études",
    "diplôme",
    "enseignement",
    "éducation",
    "educational background",
    "academic background",
    "academic history",
    "education",
    "studies",
  ],
  certification: [
    "certifications",
    "formations et certifications",
    "certification",
    "certificats",
    "certificats et formations",
    "training and certifications",
    "licenses & certifications",
    "licenses and certifications",
    "certifications and licenses",
    "qualifications",
  ],
  langue: [
    "compétences linguistiques",
    "competences linguistiques",
    "langues",
    "langue",
    "languages",
    "language skills",
    "linguistic skills",
    "language proficiency",
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

  // Sélecteurs courants pour les headers d'accordéon (SF, Workday, Taleo, SR…)
  // Avec traversée Shadow DOM pour les Web Components (SmartRecruiters SPL).
  var candidates = querySelectorAllDeep(
    document,
    'button, [role="button"], summary, a, h2, h3, h4, h5, h6, ' +
      '[class*="accordion"], [class*="section-header"], [class*="panel-title"], ' +
      '[class*="panel-heading"], [class*="acc-header"], [class*="acc-title"], ' +
      '[class*="toggle"], [class*="collapse"], [class*="expand"], ' +
      '[class*="typography"], spl-typography-title, spl-typography',
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
    "intitulé",
    "intitule",
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
    "du",
    "depuis",
    "start date",
    "from",
    "date from",
    "employment start",
    "starting",
  ],
  date_fin: [
    "date de fin",
    "date fin",
    "fin",
    "fin d emploi",
    "à",
    "jusqu à",
    "jusqu a",
    "end date",
    "to",
    "date to",
    "employment end",
    "until",
  ],
  lieu: [
    "lieu",
    "ville",
    "localisation",
    "lieu de travail",
    "emplacement",
    "emplacement du bureau",
    "office location",
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
    "je travaille actuellement ici",
    "je travaille actuellement",
    "current employer",
    "currently employed",
    "current position",
    "i currently work here",
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

var CERTIFICATION_SUBFIELDS = {
  nom_certification: [
    "nom de la certification",
    "nom du certificat",
    "intitule de la certification",
    "titre",
    "nom",
    "certification name",
    "certificate name",
    "certification",
    "name",
    "title",
  ],
  organisme: [
    "organisme",
    "organisme délivreur",
    "organisme delivreur",
    "organisme certificateur",
    "issuing organization",
    "issuing authority",
    "issuer",
    "provider",
    "authority",
  ],
  annee: [
    "année",
    "annee",
    "année d obtention",
    "annee d obtention",
    "date d obtention",
    "year",
    "issue date",
    "date issued",
    "completion date",
  ],
  description: [
    "description",
    "détails",
    "details",
    "description de la certification",
  ],
};

var LANGUE_SUBFIELDS = {
  langue: [
    "langue",
    "nom de la langue",
    "language",
    "language name",
  ],
  niveau_parle: [
    "niveau parlé",
    "niveau parle",
    "expression orale",
    "oral",
    "spoken",
    "speaking",
    "speaking level",
    "oral proficiency",
  ],
  niveau_ecrit: [
    "niveau écrit",
    "niveau ecrit",
    "expression écrite",
    "expression ecrite",
    "écrit",
    "ecrit",
    "written",
    "writing",
    "writing level",
    "written proficiency",
  ],
  niveau_lu: [
    "niveau lu",
    "niveau de compréhension",
    "niveau de comprehension",
    "compréhension",
    "comprehension",
    "lu",
    "reading",
    "reading level",
    "listening",
  ],
  niveau: [
    "niveau",
    "niveau de maîtrise",
    "niveau de maitrise",
    "level",
    "proficiency",
    "proficiency level",
    "language proficiency",
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
  // Sélecteur élargi : tags standards + custom elements Web Components
  // (SmartRecruiters SPL : <spl-typography-title>, etc.) via traversée
  // shadow DOM et match sur tagName ou attributs.
  var headings = querySelectorAllDeep(
    document,
    'h1, h2, h3, h4, h5, h6, legend, summary, ' +
      '[class*="section"], [class*="header"], [class*="heading"], [class*="title"], ' +
      '[class*="panel-heading"], [class*="acc-header"], [class*="accordion"], ' +
      '[class*="typography"], ' +
      '[role="heading"], [role="tab"], ' +
      // Web Components — convention "tag avec tiret"
      'spl-typography-title, spl-typography, spl-section-title, ' +
      '[is*="title"], [is*="heading"]',
  );

  // Fallback : si rien trouvé, scanner tous les custom elements (tag avec tiret)
  // dont le innerText est court (≤ 80 chars = heading-like).
  if (headings.length === 0 || true) {
    var customEls = querySelectorAllDeep(document, '*');
    for (var x = 0; x < customEls.length; x++) {
      var ce = customEls[x];
      if (ce.tagName && ce.tagName.indexOf("-") > -1) {
        // C'est un custom element (Web Component)
        if (headings.indexOf(ce) === -1) headings.push(ce);
      }
    }
  }

  var best = null;
  var bestLen = Infinity;

  for (var i = 0; i < headings.length; i++) {
    var raw = (headings[i].innerText || headings[i].textContent || "").substring(0, 200);
    var text = normalize(raw);
    if (!text || text.length > 100) continue;
    for (var j = 0; j < patterns.length; j++) {
      if (text.includes(patterns[j])) {
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
  // Workday (data-automation-id), SmartRecruiters (spl-button) et inputs.
  var BTN_SELECTOR =
    'button, a, [role="button"], ' +
    'input[type="button"], input[type="submit"], input[type="image"], ' +
    'span[onclick], div[onclick], li[onclick], i[onclick], ' +
    '.addRowButton, [class*="addRow"], [id*="addRow"], ' +
    '[class*="add-link"], [class*="addLink"], [class*="ftl-add"], ' +
    '[class*="add-button"], [class*="addButton"], ' +
    '[data-action*="add"], [data-automation-id*="add"], ' +
    // SmartRecruiters Pattern Library : <spl-button>, <spl-icon-button>, etc.
    'spl-button, spl-icon-button, [is*="button"]';

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
  //    (prioritaire car plus fiable que la proximité DOM). Traverse Shadow DOM.
  if (typePatterns) {
    var allBtnsGlobal = querySelectorAllDeep(document, BTN_SELECTOR);
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
    var btns = querySelectorAllDeep(parent, BTN_SELECTOR);
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
    var sibBtns = querySelectorAllDeep(sibling, BTN_SELECTOR);
    for (var k = 0; k < sibBtns.length; k++) {
      if (isAddBtn(sibBtns[k])) {
        Logger.debug("Bouton Ajouter trouvé (sibling): " + (sibBtns[k].title || sibBtns[k].innerText || "").substring(0, 40));
        return sibBtns[k];
      }
    }
    sibling = sibling.nextElementSibling;
  }

  // 4. Fallback global non-typé : proximité verticale avec le header (deep)
  var allBtns = querySelectorAllDeep(document, BTN_SELECTOR);
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
  timeoutMs = timeoutMs || 2000;
  scope = scope || document.body;

  return new Promise(function (resolve) {
    var initialCount = scope.querySelectorAll(
      'input:not([type="hidden"]), textarea, select'
    ).length;

    var resolved = false;
    var firstChangeAt = 0;
    var stabilityMs = 250; // attendre que le DOM se stabilise (selects async)
    var stabilityTimer = null;

    function finish() {
      if (resolved) return;
      resolved = true;
      try { observer.disconnect(); } catch (_) {}
      if (stabilityTimer) clearTimeout(stabilityTimer);
      // Petit délai supplémentaire pour les animations CSS et le rendu
      setTimeout(resolve, 100);
    }

    function scheduleStabilityCheck() {
      if (stabilityTimer) clearTimeout(stabilityTimer);
      stabilityTimer = setTimeout(function () { finish(); }, stabilityMs);
    }

    var observer = new MutationObserver(function () {
      var current = scope.querySelectorAll(
        'input:not([type="hidden"]), textarea, select'
      ).length;
      var dialog = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
      var hasNew =
        current > initialCount ||
        (dialog && dialog.querySelector('input, textarea, select'));
      if (hasNew) {
        if (!firstChangeAt) firstChangeAt = Date.now();
        // Au lieu de finir tout de suite, on relance le compteur de stabilité
        // pour attendre que SF finisse de charger ses selects async.
        scheduleStabilityCheck();
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

  Logger.log("fillSubfields : " + inputs.length + " input(s) détecté(s) dans le container");

  for (var i = 0; i < inputs.length; i++) {
    var el = inputs[i];
    var inputLabel = getInputLabel(el);
    var role = el.getAttribute("role") || "";
    var debugId = "[" + i + "] " + el.tagName.toLowerCase() +
      (role ? " role=" + role : "") +
      (el.type ? " type=" + el.type : "") +
      ' "' + inputLabel.substring(0, 50) + '"';

    if (shouldIgnore(el)) {
      Logger.log("  " + debugId + " → ignoré (shouldIgnore)");
      continue;
    }

    var fieldKey = detectSubfieldType(el, subfields);
    if (!fieldKey) {
      Logger.log("  " + debugId + " → aucun fieldKey détecté");
      continue;
    }
    if (!values[fieldKey]) {
      Logger.log("  " + debugId + " → fieldKey=" + fieldKey + " mais valeur vide");
      continue;
    }

    var value = values[fieldKey];
    var strategy;

    try {
      if (el.tagName === "SELECT") {
        fillSelectField(el, value);
        strategy = "fillSelectField";
      } else if (el.tagName === "TEXTAREA") {
        fillTextareaField(el, value);
        strategy = "fillTextareaField";
      } else if (isSFCombobox(el)) {
        var ok = await fillSFCombobox(el, value);
        strategy = "fillSFCombobox(" + (ok ? "ok" : "ECHEC") + ")";
        if (!ok) {
          Logger.log("  " + debugId + " → fieldKey=" + fieldKey + " value=" + value + " → " + strategy);
          continue;
        }
      } else if (DATE_KEYS.indexOf(fieldKey) !== -1 || isDateField(el)) {
        if (window.DateHandler) {
          await DateHandler.fill(el, value);
        } else {
          await fillDateField(el, value);
        }
        strategy = "fillDateField";
      } else {
        fillInputField(el, value);
        strategy = "fillInputField";
      }
      showFieldFeedback(el);
      filled++;
      Logger.log("  " + debugId + " → fieldKey=" + fieldKey + " value='" + value + "' → " + strategy);
    } catch (err) {
      Logger.error("Erreur remplissage sous-champ " + fieldKey, err);
    }
  }

  return filled;
}

/**
 * Récupère le label associé à un input (via for/id, aria-label, placeholder, etc.)
 * Utilisé pour les logs de debug.
 * @param {Element} el
 * @returns {string}
 */
function getInputLabel(el) {
  var id = el.getAttribute("id");
  if (id) {
    try {
      var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (label) {
        var t = (label.innerText || label.textContent || "").trim();
        if (t) return t;
      }
    } catch (_) {}
  }
  return (
    el.getAttribute("aria-label") ||
    el.getAttribute("placeholder") ||
    el.getAttribute("name") ||
    el.getAttribute("title") ||
    ""
  ).trim();
}

/**
 * Détecte si un input est un combobox SAP/SuccessFactors.
 * @param {Element} el
 * @returns {boolean}
 */
function isSFCombobox(el) {
  if (el.tagName !== "INPUT") return false;

  // role=combobox = indice le plus fiable
  if (el.getAttribute("role") === "combobox") return true;

  // aria-owns/controls vers une listbox
  if (el.getAttribute("aria-owns") || el.getAttribute("aria-controls")) return true;

  // Classes SF connues
  var classes = el.className || "";
  if (
    classes.indexOf("rcmpaginatedselect") !== -1 ||
    classes.indexOf("sfCascadingPicklist") !== -1 ||
    classes.indexOf("picklist") !== -1
  ) return true;

  // Bouton voisin _selectButton (SF nomme l'input "X_input" et le bouton "X_selectButton")
  var id = el.getAttribute("id") || "";
  if (id) {
    var btnId = id.replace(/_input$/, "_selectButton");
    if (btnId !== id && document.getElementById(btnId)) return true;
  }

  // Ancêtre avec classes picklist/select-container
  try {
    var ancestor = el.closest(
      '[class*="paginatedPicklistContainer"], [class*="picklist"], ' +
      '[class*="Picklist"], [class*="selectContainer"], [class*="select-container"]'
    );
    if (ancestor) return true;
  } catch (_) {}

  return false;
}

/**
 * Remplit un combobox custom SAP/SuccessFactors en :
 *  1. Cliquant pour ouvrir le menu (via main world car juic.fire)
 *  2. Attendant que la liste d'options apparaisse
 *  3. Cherchant l'option qui match la valeur (texte exact ou inclusion)
 *  4. Cliquant cette option (via main world)
 *
 * @param {Element} input
 * @param {string} value
 * @returns {Promise<boolean>} true si une option a été cliquée
 */
// Circuit breaker : si la listbox SF ne s'ouvre jamais après plusieurs
// tentatives, on arrête d'essayer pour ne pas ralentir le remplissage
// des autres champs. Reset à chaque nouvel appel de remplissage.
var SF_COMBOBOX_FAILURES = 0;
var SF_COMBOBOX_DISABLED = false;
var SF_UNFILLED_FIELDS = []; // pour highlight final
function resetSFComboboxState() {
  SF_COMBOBOX_FAILURES = 0;
  SF_COMBOBOX_DISABLED = false;
  SF_UNFILLED_FIELDS = [];
}

/**
 * Liste publique des champs SF qui n'ont pas pu être remplis automatiquement
 * (comboboxes filtrées par isTrusted). Utilisé en fin de remplissage pour
 * highlighter visuellement les champs à compléter à la main.
 * @returns {Element[]}
 */
function getSFUnfilledFields() {
  return SF_UNFILLED_FIELDS.slice();
}

async function fillSFCombobox(input, value) {
  if (!input || !value) return false;
  var inputId = input.getAttribute("id");
  if (!inputId) return false;

  // Court-circuit immédiat si on sait déjà que SF rejette tout
  if (SF_COMBOBOX_DISABLED) {
    if (SF_UNFILLED_FIELDS.indexOf(input) === -1) SF_UNFILLED_FIELDS.push(input);
    return false;
  }

  // STRATÉGIE 0 (la plus rapide) : injection directe valeur + déclenchement onblur
  var directResult = await trySetSFComboboxDirect(input, value);
  if (directResult.accepted) {
    Logger.log("trySetSFComboboxDirect[" + inputId + "] → accepté");
    SF_COMBOBOX_FAILURES = 0;
    return true;
  }

  // Échec direct : compter aussi pour le circuit breaker
  // (évite de tester ensuite 33 fois "ouvrir menu" qui échoue tout autant)
  SF_COMBOBOX_FAILURES++;
  if (SF_COMBOBOX_FAILURES >= 3) {
    if (!SF_COMBOBOX_DISABLED) {
      Logger.warn(
        "fillSFCombobox: 3 échecs consécutifs (injection rejetée par SF) — " +
        "désactivation des comboboxes SF. Ces champs devront être remplis manuellement."
      );
      SF_COMBOBOX_DISABLED = true;
    }
    if (SF_UNFILLED_FIELDS.indexOf(input) === -1) SF_UNFILLED_FIELDS.push(input);
    return false;
  }

  // 1. Ouvrir le menu via plusieurs stratégies
  await openSFCombobox(input);

  // 2. Attendre que la listbox apparaisse (timeout court pour rester rapide)
  var listbox = await waitForSFListbox(input, 800);
  if (!listbox) {
    SF_COMBOBOX_FAILURES++;
    if (SF_COMBOBOX_FAILURES >= 3) {
      Logger.warn(
        "fillSFCombobox: 3 échecs consécutifs — désactivation des comboboxes SF " +
        "(événements probablement filtrés par isTrusted). Ces champs devront être " +
        "remplis manuellement."
      );
      SF_COMBOBOX_DISABLED = true;
    } else {
      Logger.warn("fillSFCombobox: listbox introuvable pour " + inputId);
    }
    if (SF_UNFILLED_FIELDS.indexOf(input) === -1) SF_UNFILLED_FIELDS.push(input);
    return false;
  }
  // Succès d'ouverture → reset le compteur
  SF_COMBOBOX_FAILURES = 0;

  var match = findOptionInListbox(listbox, value);

  // 3. Si pas de match dans les options visibles, essayer de filtrer en tapant
  if (!match) {
    Logger.log("fillSFCombobox: tentative filtre par frappe pour '" + value + "'");
    var typedValue = value.substring(0, Math.min(value.length, 12));
    execInMainWorld(
      "(function(){try{" +
        "var i=document.getElementById(" + jsStringLit(inputId) + ");" +
        "if(i){" +
          "i.focus();" +
          "i.value=" + jsStringLit(typedValue) + ";" +
          "i.dispatchEvent(new Event('input',{bubbles:true}));" +
          "i.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:'a',keyCode:65}));" +
          "}}catch(e){console.warn('[CVGen MAIN] type combobox failed',e);}}())"
    );
    await new Promise(function (r) { setTimeout(r, 500); });
    listbox = (await waitForSFListbox(input, 1000)) || listbox;
    match = findOptionInListbox(listbox, value);
    if (!match) {
      Logger.warn(
        "fillSFCombobox: aucune option pour '" + value +
        "' parmi " + countOptions(listbox) + " (après filtre)"
      );
      try { document.body.click(); } catch (_) {}
      return false;
    }
  }

  // 4. Cliquer l'option (main world)
  if (match.id) {
    execInMainWorld(
      "(function(){try{var o=document.getElementById(" + jsStringLit(match.id) + ");" +
      "if(o){o.click();}}catch(e){console.warn('[CVGen MAIN] option click failed',e);}}())"
    );
  } else {
    try { match.click(); } catch (_) {}
  }

  await new Promise(function (r) { setTimeout(r, 150); });
  return true;
}

/**
 * Tente de remplir un combobox SF en :
 *  1. Setting input.value directement via le setter natif (depuis main world)
 *  2. Dispatchant input/change events
 *  3. Déclenchant onblur (qui appelle juic.fire('_onBlur') côté SF)
 *  4. Vérifiant si SF a accepté la valeur (input.value reste = value
 *     OU title de l'input mis à jour OU aria-invalid disparaît)
 *
 * Cette approche contourne le problème isTrusted car SF valide la valeur
 * saisie sans avoir besoin d'ouvrir le menu déroulant.
 *
 * @param {Element} input
 * @param {string} value
 * @returns {Promise<boolean>}
 */
async function trySetSFComboboxDirect(input, value) {
  var inputId = input.getAttribute("id");
  if (!inputId) {
    return { accepted: false, currentValue: "", currentTitle: "", ariaInvalid: "" };
  }

  var litVal = jsStringLit(value);
  var litId = jsStringLit(inputId);

  // Exécuter dans le main world : on a accès au setter natif ET aux handlers juic
  execInMainWorld(
    "(function(){try{" +
      "var i=document.getElementById(" + litId + ");" +
      "if(!i)return;" +
      "i.focus();" +
      // Utiliser le setter natif pour bypasser tout setter React-like
      "var d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value');" +
      "if(d&&d.set){d.set.call(i," + litVal + ");}else{i.value=" + litVal + ";}" +
      // Mettre aussi title (SF affiche souvent title comme placeholder/valeur)
      "i.setAttribute('title'," + litVal + ");" +
      // Events de saisie standard
      "i.dispatchEvent(new Event('input',{bubbles:true,cancelable:true}));" +
      "i.dispatchEvent(new Event('change',{bubbles:true,cancelable:true}));" +
      // Déclencher onblur : SF a typiquement onblur='juic.fire(\"X:\",\"_onBlur\",event)'
      "var ob=i.getAttribute('onblur');" +
      "if(ob){try{(function(event){eval(ob);})(new FocusEvent('blur',{bubbles:true,relatedTarget:document.body}));}catch(_){}}" +
      "i.dispatchEvent(new FocusEvent('blur',{bubbles:true,cancelable:true,relatedTarget:document.body}));" +
      "i.dispatchEvent(new Event('focusout',{bubbles:true,cancelable:true}));" +
      // Retirer le focus
      "if(document.activeElement===i){i.blur();}" +
    "}catch(e){console.warn('[CVGen MAIN] direct set combobox failed',e);}}())"
  );

  // Attendre que SF traite le _onBlur (court car SF revert très vite quand il refuse)
  await new Promise(function (r) { setTimeout(r, 120); });

  // Vérifier si la valeur a été acceptée par SF
  var currentValue = (input.value || "").trim();
  var currentTitle = (input.getAttribute("title") || "").trim();
  var ariaInvalid = input.getAttribute("aria-invalid");
  var placeholder = (input.getAttribute("placeholder") || "").trim();
  var normVal = normalize(value);

  // Acceptée si :
  //  - la valeur reste dans l'input (SF ne l'a pas revertée à "Aucune sélection")
  //  - et aria-invalid n'est pas "true"
  var valueKept =
    normalize(currentValue) === normVal ||
    normalize(currentValue).indexOf(normVal) !== -1 ||
    normalize(currentTitle) === normVal ||
    normalize(currentTitle).indexOf(normVal) !== -1;

  var notInvalid = ariaInvalid !== "true";
  var notReverted = currentValue !== "" && currentValue !== placeholder;

  return {
    accepted: valueKept && notInvalid && notReverted,
    currentValue: currentValue,
    currentTitle: currentTitle,
    ariaInvalid: ariaInvalid || "",
  };
}

/**
 * Ouvre un combobox SuccessFactors via plusieurs stratégies cumulatives :
 *  1. Eval de l'attribut onclick dans le main world (le plus fiable car
 *     SF a typiquement onclick="juic.fire('152:','_click',event)")
 *  2. Clic main world sur le _selectButton voisin
 *  3. Clic main world sur l'input lui-même
 *  4. Focus + dispatch mousedown/mouseup/click depuis l'isolated world
 *
 * @param {Element} input
 * @returns {Promise<void>}
 */
async function openSFCombobox(input) {
  var inputId = input.getAttribute("id") || "";
  var onclickAttr = input.getAttribute("onclick") || "";
  var onkeydownAttr = input.getAttribute("onkeydown") || "";
  var btnId = inputId ? inputId.replace(/_input$/, "_selectButton") : "";
  var btnEl = btnId && btnId !== inputId ? document.getElementById(btnId) : null;
  var btnOnclick = btnEl ? (btnEl.getAttribute("onclick") || "") : "";

  if (!inputId) return;

  // Stratégie combinée : exécutée dans le main world en un seul payload pour
  // éviter les délais de plusieurs round-trips. On essaie successivement :
  //  (a) eval onclick du _selectButton voisin
  //  (b) eval onclick de l'input
  //  (c) dispatch ArrowDown (les comboboxes ARIA accessibles s'ouvrent souvent
  //      ainsi, et SF a typiquement onkeydown="juic.fire(...)")
  //  (d) eval onkeydown directement
  //  (e) .focus() + .click() sur le button puis l'input
  Logger.log("openSFCombobox: tentative pour " + inputId);
  var script =
    "(function(){try{" +
      "var input = document.getElementById(" + jsStringLit(inputId) + ");" +
      "if(!input) return;" +
      "input.focus();" +
      (btnId && btnEl
        ? "var btn = document.getElementById(" + jsStringLit(btnId) + ");" +
          (btnOnclick
            ? "try{(function(event){" + btnOnclick + "})(new MouseEvent('click',{bubbles:true}));}catch(_){}"
            : "") +
          "try{btn&&btn.click();}catch(_){}"
        : "") +
      // ArrowDown au cas où SF écoute keydown pour ouvrir
      "try{var kd=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'ArrowDown',code:'ArrowDown',keyCode:40,which:40});" +
        "Object.defineProperty(kd,'keyCode',{get:function(){return 40;}});" +
        "Object.defineProperty(kd,'which',{get:function(){return 40;}});" +
        "input.dispatchEvent(kd);}catch(_){}" +
      // Eval onkeydown si présent
      (onkeydownAttr
        ? "try{(function(event){" + onkeydownAttr + "})(new KeyboardEvent('keydown',{bubbles:true,key:'ArrowDown',keyCode:40}));}catch(_){}"
        : "") +
      // Eval onclick de l'input
      (onclickAttr
        ? "try{(function(event){" + onclickAttr + "})(new MouseEvent('click',{bubbles:true}));}catch(_){}"
        : "") +
      "try{input.click();}catch(_){}" +
    "}catch(e){console.warn('[CVGen MAIN] openSFCombobox failed',e);}}())";

  execInMainWorld(script);
  await new Promise(function (r) { setTimeout(r, 80); });
}

/**
 * Attend qu'une listbox SF apparaisse (associée à l'input via aria-owns
 * ou détectée globalement). Renvoie l'élément ou null.
 */
async function waitForSFListbox(input, timeoutMs) {
  var listboxId =
    input.getAttribute("aria-owns") || input.getAttribute("aria-controls");
  var start = Date.now();
  while (Date.now() - start < timeoutMs) {
    var listbox = null;
    if (listboxId) {
      listbox = document.getElementById(listboxId);
    }
    if (!listbox) {
      listbox = document.querySelector(
        '[role="listbox"]:not([aria-hidden="true"]), ' +
        '[class*="dropdown-menu"]:not([style*="display: none"]):not([style*="display:none"]), ' +
        '[class*="picklist-popover"]:not([aria-hidden="true"]), ' +
        '[class*="sfPicklist"]:not([aria-hidden="true"]), ' +
        'ul[class*="dropdown"]:not([aria-hidden="true"])'
      );
    }
    if (listbox && countOptions(listbox) > 0) {
      return listbox;
    }
    await new Promise(function (r) { setTimeout(r, 100); });
  }
  return null;
}

function countOptions(listbox) {
  if (!listbox) return 0;
  return listbox.querySelectorAll(
    '[role="option"], li[id], li[class*="option"], [class*="picklistoption"]'
  ).length;
}

/**
 * Cherche une option dans la listbox qui match la value (exact puis inclusion).
 */
function findOptionInListbox(listbox, value) {
  if (!listbox) return null;
  var options = Array.from(
    listbox.querySelectorAll(
      '[role="option"], li[id], li[class*="option"], [class*="picklistoption"]'
    )
  ).filter(function (o) {
    return (o.textContent || "").trim().length > 0;
  });
  if (options.length === 0) return null;

  var normalizedVal = normalize(value);

  // 1. Exact match
  for (var i = 0; i < options.length; i++) {
    if (normalize(options[i].textContent || "") === normalizedVal) {
      return options[i];
    }
  }
  // 2. Option démarre par value
  for (var s = 0; s < options.length; s++) {
    var t = normalize(options[s].textContent || "");
    if (t.indexOf(normalizedVal) === 0) return options[s];
  }
  // 3. Inclusion bidirectionnelle
  for (var k = 0; k < options.length; k++) {
    var optText = normalize(options[k].textContent || "");
    if (
      (optText.length > 2 && normalizedVal.indexOf(optText) !== -1) ||
      (normalizedVal.length > 2 && optText.indexOf(normalizedVal) !== -1)
    ) {
      return options[k];
    }
  }
  return null;
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

  // Matching par SPÉCIFICITÉ : le keyword le plus LONG gagne (= plus spécifique).
  // Ex: "s agit il de votre diplome le plus eleve" battra "diplome" pour le
  // champ "S'agit-il de votre diplôme le plus élevé?".
  var bestKey = null;
  var bestScore = 0;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var keywords = subfields[key].map(normalize);
    for (var j = 0; j < normalizedCandidates.length; j++) {
      var cand = normalizedCandidates[j];
      for (var k = 0; k < keywords.length; k++) {
        var kw = keywords[k];
        if (!kw) continue;
        // Pour les keywords TRÈS courts (≤ 3 chars), exiger match exact OU
        // word-boundary. Sinon "du" matcherait "produit", "introduit", etc.
        var matched;
        if (kw.length <= 3) {
          if (cand === kw) {
            matched = true;
          } else {
            // word-boundary regex sur la chaîne normalisée (lettres/chiffres/espaces)
            try {
              var re = new RegExp("(^|\\s)" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\s|$)");
              matched = re.test(cand);
            } catch (_) {
              matched = false;
            }
          }
        } else {
          matched = (cand === kw || cand.includes(kw));
        }
        if (matched) {
          if (kw.length > bestScore) {
            bestScore = kw.length;
            bestKey = key;
          }
        }
      }
    }
  }

  return bestKey;
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

  resetSFComboboxState();

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
      var beforeDeletes = snapshotDeleteButtons();
      Logger.log(
        "Clic Ajouter exp #" + (i + 1) + " sur <" + addBtn.tagName.toLowerCase() +
        " class='" + (addBtn.className || "").substring(0, 60) + "'>"
      );
      clickElementRobust(addBtn);
      await waitForNewFields(2500);

      var newContainer = findContainerOfNewEntry(beforeSnapshot, beforeDeletes);
      if (!newContainer) {
        Logger.warn("Clic Ajouter exp n'a créé aucun nouvel input — arrêt");
        break;
      }
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
 * Snapshot des boutons "Supprimer" présents avant un clic Ajouter.
 * Permet d'identifier ensuite le NOUVEAU bouton Supprimer = celui de
 * l'entrée fraîchement créée.
 *
 * @returns {Set<Element>}
 */
function snapshotDeleteButtons() {
  var set = new Set();
  findDeleteButtons(document.body).forEach(function (b) { set.add(b); });
  return set;
}

/**
 * Compare le DOM avant/après un clic Ajouter et retourne le container
 * de la NOUVELLE entrée. Stratégie principale : on cherche le nouveau
 * bouton "Supprimer" (unique par entrée, apparaît immédiatement) et on
 * remonte pour trouver le plus grand ancêtre qui contient ce Supprimer
 * SANS contenir d'autres boutons Supprimer.
 *
 * Fallback (cas sans bouton Supprimer) : LCA des nouveaux inputs.
 *
 * @param {Set<Element>} beforeInputSet  - snapshot des inputs (snapshotInputs())
 * @param {Set<Element>} beforeDeleteSet - snapshot des Supprimer (snapshotDeleteButtons())
 * @returns {Element|null}
 */
function findContainerOfNewEntry(beforeInputSet, beforeDeleteSet) {
  // ── Stratégie 1 : nouveau bouton Supprimer ──
  if (beforeDeleteSet) {
    var nowDeletes = findDeleteButtons(document.body);
    var newDeletes = nowDeletes.filter(function (b) { return !beforeDeleteSet.has(b); });

    if (newDeletes.length > 0) {
      // Prendre le DERNIER nouveau Supprimer (l'entrée la plus récente)
      var lastDelete = newDeletes[newDeletes.length - 1];
      var otherDeletes = nowDeletes.filter(function (b) { return b !== lastDelete; });

      // Remonter pour trouver le PLUS GRAND ancêtre qui :
      //  - contient ce nouveau Supprimer
      //  - contient au moins 1 input
      //  - ne contient AUCUN autre bouton Supprimer (= isolé à cette entrée)
      var bestContainer = null;
      var container = lastDelete.parentElement;
      while (container && container !== document.body) {
        var hasInput = container.querySelector(
          'input:not([type="hidden"]), textarea, select'
        );
        var hasOtherDelete = otherDeletes.some(function (b) {
          return container.contains(b);
        });
        if (hasOtherDelete) break; // ne pas remonter plus haut
        if (hasInput) bestContainer = container;
        container = container.parentElement;
      }
      if (bestContainer) {
        var inputCount = bestContainer.querySelectorAll(
          'input:not([type="hidden"]), textarea, select'
        ).length;
        Logger.log(
          "Container nouvelle entrée trouvé via bouton Supprimer : <" +
          bestContainer.tagName.toLowerCase() +
          " class='" + (bestContainer.className || "").substring(0, 60) +
          "'> avec " + inputCount + " input(s)"
        );
        return bestContainer;
      }
    }
  }

  // ── Stratégie 2 (fallback) : LCA des nouveaux inputs ──
  var nowInputs = Array.from(
    document.querySelectorAll('input:not([type="hidden"]), textarea, select')
  );
  var newInputs = nowInputs.filter(function (el) { return !beforeInputSet.has(el); });

  if (newInputs.length === 0) return null;

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

  resetSFComboboxState();

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
      var beforeDeletes = snapshotDeleteButtons();
      Logger.log(
        "Clic Ajouter formation #" + (i + 1) + " sur <" + addBtn.tagName.toLowerCase() +
        " class='" + (addBtn.className || "").substring(0, 60) + "'>"
      );
      clickElementRobust(addBtn);
      await waitForNewFields(2500);

      var newContainer = findContainerOfNewEntry(beforeSnapshot, beforeDeletes);
      if (!newContainer) {
        Logger.warn("Clic Ajouter formation n'a créé aucun nouvel input — arrêt");
        break;
      }
      container = newContainer;
    }

    var values = {
      nom_formation: form.diplome || form.niveauEtudes || "",
      diplome: form.niveauEtudes || form.diplome || "",
      // SF demande "S'agit-il de votre diplôme le plus élevé ?" → Oui pour la
      // 1ère entrée (la plus récente / la plus haute), Non pour les suivantes.
      diplome_plus_eleve: i === 0 ? "Oui" : "Non",
      etablissement: form.etablissement || "",
      annee_obtention: form.annee || form.dateFin || "",
      domaine: form.mention || form.domaine || "",
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
 * Remplit les certifications du profil (section "Formations et certifications"
 * sur SuccessFactors, ou "Certifications" sur d'autres ATS).
 *
 * @param {Object} profil
 * @returns {Promise<number>}
 */
async function fillCertificationSections(profil) {
  var certifications = profil.certifications || [];
  if (certifications.length === 0) return 0;

  resetSFComboboxState();

  if (certifications.length > 10) {
    Logger.warn(
      "Profil contient " + certifications.length + " certifications, plafonné à 10"
    );
    certifications = certifications.slice(0, 10);
  }

  var sectionEl = await expandSection("certification");
  if (!sectionEl) sectionEl = findSection("certification");
  if (!sectionEl) {
    Logger.log("Section certification non trouvée sur cette page");
    return 0;
  }

  var existing = findAllDynamicContainers(sectionEl);
  Logger.log(
    "Section certification : " + existing.length +
    " entrée(s) existante(s), profil = " + certifications.length + " certif(s)."
  );

  var added = 0;

  for (var i = 0; i < certifications.length; i++) {
    var cert = certifications[i];
    if (!cert.nom) continue;

    var container;
    if (i < existing.length) {
      container = existing[i];
      Logger.log("Certification #" + (i + 1) + " : réutilisation entrée existante");
    } else {
      var addBtn = findAddButton(sectionEl, "certification");
      if (!addBtn) {
        Logger.warn("Bouton Ajouter (certification) non trouvé");
        break;
      }
      var beforeSnapshot = snapshotInputs();
      var beforeDeletes = snapshotDeleteButtons();
      Logger.log(
        "Clic Ajouter certification #" + (i + 1) + " sur <" +
        addBtn.tagName.toLowerCase() +
        " class='" + (addBtn.className || "").substring(0, 60) + "'>"
      );
      clickElementRobust(addBtn);
      await waitForNewFields(2500);

      var newContainer = findContainerOfNewEntry(beforeSnapshot, beforeDeletes);
      if (!newContainer) {
        Logger.warn("Clic Ajouter certification n'a créé aucun nouvel input — arrêt");
        break;
      }
      container = newContainer;
    }

    var values = {
      nom_certification: cert.nom || "",
      organisme: cert.organisme || "",
      annee: cert.annee || "",
      description: cert.description || "",
    };

    var filled = await fillSubfields(container, CERTIFICATION_SUBFIELDS, values);
    Logger.log("Certification #" + (i + 1) + " : " + filled + " champ(s) rempli(s)");
    added++;
  }

  Logger.log(added + " certification(s) traitée(s)");
  return added;
}

/**
 * Remplit les langues du profil (section "Compétences linguistiques" sur SF,
 * ou "Languages" sur d'autres ATS).
 *
 * @param {Object} profil
 * @returns {Promise<number>}
 */
async function fillLangueSections(profil) {
  var langues = profil.langues || [];
  if (langues.length === 0) return 0;

  // Normaliser : accepter aussi un array de strings
  langues = langues.map(function (l) {
    if (typeof l === "string") return { nom: l, niveau: "" };
    return l;
  }).filter(function (l) { return l && l.nom; });
  if (langues.length === 0) return 0;

  resetSFComboboxState();

  if (langues.length > 15) {
    Logger.warn("Profil contient " + langues.length + " langues, plafonné à 15");
    langues = langues.slice(0, 15);
  }

  var sectionEl = await expandSection("langue");
  if (!sectionEl) sectionEl = findSection("langue");
  if (!sectionEl) {
    Logger.log("Section langue non trouvée sur cette page");
    return 0;
  }

  var existing = findAllDynamicContainers(sectionEl);
  Logger.log(
    "Section langue : " + existing.length +
    " entrée(s) existante(s), profil = " + langues.length + " langue(s)."
  );

  var added = 0;

  for (var i = 0; i < langues.length; i++) {
    var lang = langues[i];
    if (!lang.nom) continue;

    var container;
    if (i < existing.length) {
      container = existing[i];
      Logger.log("Langue #" + (i + 1) + " : réutilisation entrée existante");
    } else {
      var addBtn = findAddButton(sectionEl, "langue");
      if (!addBtn) {
        Logger.warn("Bouton Ajouter (langue) non trouvé");
        break;
      }
      var beforeSnapshot = snapshotInputs();
      var beforeDeletes = snapshotDeleteButtons();
      Logger.log(
        "Clic Ajouter langue #" + (i + 1) + " sur <" +
        addBtn.tagName.toLowerCase() +
        " class='" + (addBtn.className || "").substring(0, 60) + "'>"
      );
      clickElementRobust(addBtn);
      await waitForNewFields(2500);

      var newContainer = findContainerOfNewEntry(beforeSnapshot, beforeDeletes);
      if (!newContainer) {
        Logger.warn("Clic Ajouter langue n'a créé aucun nouvel input — arrêt");
        break;
      }
      container = newContainer;
    }

    // Niveau par défaut si non renseigné dans le profil
    var niveauDefault = lang.niveau || "Bon";
    var values = {
      langue: lang.nom,
      niveau: niveauDefault,
      niveau_parle: niveauDefault,
      niveau_ecrit: niveauDefault,
      niveau_lu: niveauDefault,
    };

    var filled = await fillSubfields(container, LANGUE_SUBFIELDS, values);
    Logger.log("Langue #" + (i + 1) + " : " + filled + " champ(s) rempli(s)");
    added++;
  }

  Logger.log(added + " langue(s) traitée(s)");
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
