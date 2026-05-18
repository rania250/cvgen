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
    'expérience professionnelle', 'experience professionnelle',
    'expériences professionnelles', 'expériences',
    'parcours professionnel', 'historique professionnel',
    'work experience', 'employment history', 'professional experience',
    'work history', 'career history'
  ],
  formation: [
    'formation', 'formations', 'parcours académique', 'parcours academique',
    'formations et certifications', 'niveau d études', 'diplôme',
    'education', 'educational background', 'academic background',
    'qualifications', 'academic history'
  ]
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

  // Sélecteurs courants pour les headers d'accordéon
  var candidates = Array.from(document.querySelectorAll(
    'button, [role="button"], summary, a, h2, h3, h4, ' +
    '[class*="accordion"], [class*="section-header"], [class*="panel-title"], ' +
    '[class*="toggle"], [class*="collapse"]'
  ));

  var headerEl = null;
  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    var text = normalize(el.innerText || el.textContent || '');
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
    headerEl.getAttribute('aria-expanded') === 'false' ||
    headerEl.getAttribute('aria-selected') === 'false' ||
    headerEl.classList.contains('collapsed') ||
    headerEl.closest('[aria-expanded="false"]') !== null;

  if (isCollapsed) {
    Logger.log('Ouverture accordéon : ' + (headerEl.innerText || '').trim());
    headerEl.click();
    await waitForNewFields(700);
  }

  return headerEl;
}

// Mots-clés des boutons "Ajouter"
var ADD_BUTTON_PATTERNS = [
  'ajouter', 'add', '+ ajouter', 'add entry', 'add experience',
  'add education', 'ajouter une expérience', 'ajouter une formation',
  'nouvelle entrée', 'new entry'
];

// ─── Sous-champs par section ──────────────────────────────────────────────────

var EXPERIENCE_SUBFIELDS = {
  poste: [
    'poste', 'titre du poste', 'intitulé du poste', 'fonction',
    'job title', 'position', 'title', 'role', 'designation'
  ],
  entreprise: [
    'entreprise', 'société', 'employeur', 'nom de l entreprise',
    'company', 'employer', 'organization', 'organisation', 'company name'
  ],
  date_debut: [
    'date de début', 'date debut', 'début', 'début d emploi',
    'start date', 'from', 'date from', 'employment start'
  ],
  date_fin: [
    'date de fin', 'date fin', 'fin', 'fin d emploi',
    'end date', 'to', 'date to', 'employment end', 'jusqu à'
  ],
  lieu: [
    'lieu', 'ville', 'localisation', 'lieu de travail',
    'location', 'city', 'work location'
  ],
  description: [
    'description', 'missions', 'responsabilités', 'tâches',
    'description du poste', 'détails',
    'description', 'responsibilities', 'duties', 'achievements', 'summary'
  ]
};

var FORMATION_SUBFIELDS = {
  diplome: [
    'diplôme', 'diplome', 'titre', 'niveau d études', 'qualification',
    'degree', 'qualification', 'certificate', 'award', 'degree type'
  ],
  etablissement: [
    'établissement', 'ecole', 'école', 'université', 'universite',
    'institution', 'school', 'university', 'college', 'institute'
  ],
  annee_obtention: [
    'année d obtention', 'annee', 'date d obtention', 'année de fin',
    'graduation year', 'year of graduation', 'end date', 'completion year'
  ],
  domaine: [
    'domaine', 'spécialité', 'filière', 'mention', 'matière principale',
    'field of study', 'major', 'subject', 'discipline', 'specialization'
  ]
};

// ─── Fonctions utilitaires ────────────────────────────────────────────────────

/**
 * Trouve une section par son titre dans la page.
 * @param {'experience'|'formation'} type
 * @returns {Element|null}
 */
function findSection(type) {
  var patterns = SECTION_PATTERNS[type].map(normalize);
  var headings = Array.from(document.querySelectorAll(
    'h1, h2, h3, h4, h5, legend, [class*="section"], [class*="header"], [class*="title"], summary'
  ));

  for (var i = 0; i < headings.length; i++) {
    var text = normalize(headings[i].innerText || headings[i].textContent || '');
    for (var j = 0; j < patterns.length; j++) {
      if (text.includes(patterns[j])) {
        return headings[i];
      }
    }
  }
  return null;
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
   * Teste si un élément est un bouton "Ajouter"
   */
  function isAddBtn(el) {
    var text = normalize(el.innerText || el.textContent || '');
    var aria = normalize(el.getAttribute('aria-label') || '');
    var title = normalize(el.getAttribute('title') || '');
    for (var j = 0; j < patterns.length; j++) {
      if (text.includes(patterns[j]) || aria.includes(patterns[j]) || title.includes(patterns[j])) {
        return true;
      }
    }
    return false;
  }

  // 1. Chercher dans le parent immédiat (3 niveaux)
  var parent = sectionEl.parentElement;
  for (var level = 0; level < 5 && parent; level++) {
    var btns = Array.from(parent.querySelectorAll('button, a, [role="button"], span[onclick], div[onclick]'));
    for (var i = 0; i < btns.length; i++) {
      if (isAddBtn(btns[i])) return btns[i];
    }
    parent = parent.parentElement;
  }

  // 2. Chercher dans les frères suivants (contenu de l'accordéon ouvert)
  var sibling = sectionEl.nextElementSibling;
  var maxSib = 15;
  while (sibling && maxSib-- > 0) {
    if (isAddBtn(sibling)) return sibling;
    var sibBtns = Array.from(sibling.querySelectorAll('button, a, [role="button"]'));
    for (var k = 0; k < sibBtns.length; k++) {
      if (isAddBtn(sibBtns[k])) return sibBtns[k];
    }
    sibling = sibling.nextElementSibling;
  }

  // 3. Fallback global : chercher dans toute la page le bouton "Ajouter"
  //    visible le plus proche du sectionEl (par position DOM)
  var allBtns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
  var sectionRect = sectionEl.getBoundingClientRect();

  var candidates = allBtns.filter(isAddBtn);
  if (candidates.length === 0) return null;

  // Trier par proximité verticale avec le header de section
  candidates.sort(function (a, b) {
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    return Math.abs(ra.top - sectionRect.bottom) - Math.abs(rb.top - sectionRect.bottom);
  });

  // Ne retourner que si c'est en dessous du header
  var best = candidates[0];
  var bestRect = best.getBoundingClientRect();
  if (bestRect.top >= sectionRect.top) return best;

  return null;
}

/**
 * Après avoir cliqué sur "Ajouter", attend que les nouveaux champs apparaissent.
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForNewFields(timeoutMs) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeoutMs || 800);
  });
}

/**
 * Remplit les sous-champs d'un formulaire dynamique apparu après "Ajouter".
 * @param {Element} container - Zone de formulaire dans laquelle chercher les champs
 * @param {Object} subfields - Dictionnaire { key: [keywords] }
 * @param {Object} values    - Dictionnaire { key: valeur }
 */
function fillSubfields(container, subfields, values) {
  var inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]), textarea, select'));
  var filled = 0;

  inputs.forEach(function (el) {
    if (shouldIgnore(el)) return;

    var fieldKey = detectSubfieldType(el, subfields);
    if (!fieldKey || !values[fieldKey]) return;

    var value = values[fieldKey];

    try {
      if (el.tagName === 'SELECT') {
        fillSelectField(el, value);
      } else if (el.tagName === 'TEXTAREA') {
        fillTextareaField(el, value);
      } else {
        fillInputField(el, value);
      }
      showFieldFeedback(el);
      filled++;
    } catch (err) {
      Logger.error('Erreur remplissage sous-champ ' + fieldKey, err);
    }
  });

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
    el.getAttribute('name') || '',
    el.getAttribute('id') || '',
    el.getAttribute('placeholder') || '',
    el.getAttribute('aria-label') || '',
    el.getAttribute('data-label') || ''
  ];

  var id = el.getAttribute('id');
  if (id) {
    try {
      var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (label) candidates.push(label.innerText || '');
    } catch (_) {}
  }

  var parentLabel = el.closest('label');
  if (parentLabel) {
    var clone = parentLabel.cloneNode(true);
    clone.querySelectorAll('input, select, textarea').forEach(function (c) { c.remove(); });
    candidates.push(clone.innerText || '');
  }

  var parent = el.parentElement;
  if (parent) {
    var clone2 = parent.cloneNode(true);
    clone2.querySelectorAll('input, select, textarea').forEach(function (c) { c.remove(); });
    candidates.push((clone2.innerText || '').split('\n')[0]);
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
  var sectionEl = await expandSection('experience');
  // Fallback : chercher le heading classique
  if (!sectionEl) sectionEl = findSection('experience');
  if (!sectionEl) {
    Logger.log('Section expérience non trouvée sur cette page');
    return 0;
  }

  var added = 0;

  for (var i = 0; i < experiences.length; i++) {
    var exp = experiences[i];
    if (!exp.poste && !exp.entreprise) continue;

    var addBtn = findAddButton(sectionEl);
    if (!addBtn) {
      Logger.warn('Bouton Ajouter (expérience) non trouvé');
      break;
    }

    addBtn.click();
    await waitForNewFields(2000); // SuccessFactors ouvre une modale lente

    // Trouver le nouveau formulaire apparu (modale ou zone inline)
    var container = findLatestDynamicForm(sectionEl);
    if (!container) {
      Logger.warn('Container du formulaire expérience non trouvé');
      continue;
    }

    var values = {
      poste:       exp.poste       || '',
      entreprise:  exp.entreprise  || '',
      date_debut:  exp.dateDebut   || '',
      date_fin:    exp.dateFin     || '',
      lieu:        exp.lieu        || '',
      description: exp.description || ''
    };

    var filled = fillSubfields(container, EXPERIENCE_SUBFIELDS, values);
    Logger.log('Expérience : ' + filled + ' champ(s) rempli(s)');
    added++;
  }

  Logger.log(added + ' expérience(s) ajoutée(s)');
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
  var sectionEl = await expandSection('formation');
  if (!sectionEl) sectionEl = findSection('formation');
  if (!sectionEl) {
    Logger.log('Section formation non trouvée sur cette page');
    return 0;
  }

  var added = 0;

  for (var i = 0; i < formations.length; i++) {
    var form = formations[i];
    if (!form.diplome && !form.etablissement) continue;

    var addBtn = findAddButton(sectionEl);
    if (!addBtn) {
      Logger.warn('Bouton Ajouter (formation) non trouvé');
      break;
    }

    addBtn.click();
    await waitForNewFields(900);

    var container = findLatestDynamicForm(sectionEl);
    if (!container) continue;

    var values = {
      diplome:          form.diplome          || form.niveauEtudes || '',
      etablissement:    form.etablissement    || '',
      annee_obtention:  form.annee            || '',
      domaine:          form.mention          || ''
    };

    fillSubfields(container, FORMATION_SUBFIELDS, values);
    added++;
  }

  Logger.log(added + ' formation(s) ajoutée(s)');
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
  var container = sectionEl.closest('section, fieldset, [class*="section"], details') || sectionEl.parentElement;
  if (!container) return null;

  // Chercher tous les containers de formulaire dans la section
  var formContainers = Array.from(container.querySelectorAll(
    'fieldset, [class*="form-group"], [class*="entry"], [class*="item"], [class*="row"], div[data-automation-id]'
  ));

  // Retourner le dernier (le plus récemment ajouté)
  if (formContainers.length > 0) {
    return formContainers[formContainers.length - 1];
  }

  return container;
}
