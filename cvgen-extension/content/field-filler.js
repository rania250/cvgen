/**
 * CVGen Field Filler
 * Injecte les valeurs du profil dans les champs HTML des formulaires.
 * Compatible React / Vue / Angular (via les setters natifs du prototype).
 */

// ─── Configs par site ────────────────────────────────────────────────────────

var SITE_CONFIGS = {
  'fr.indeed.com': {
    name: 'Indeed FR',
    formSelector: 'form[data-testid], form.ia-BasePage-main, form'
  },
  'www.indeed.com': {
    name: 'Indeed',
    formSelector: 'form[data-testid], form.ia-BasePage-main, form'
  },
  'www.linkedin.com': {
    name: 'LinkedIn',
    formSelector: '.jobs-easy-apply-modal form, form'
  },
  'www.welcometothejungle.com': {
    name: 'Welcome to the Jungle',
    formSelector: 'form'
  },
  'candidat.francetravail.fr': {
    name: 'France Travail',
    formSelector: 'form, [role="form"]'
  },
  'app.greenhouse.io': {
    name: 'Greenhouse',
    formSelector: 'form#application_form, form'
  },
  'jobs.lever.co': {
    name: 'Lever',
    formSelector: 'form.application-form, form'
  }
};

/**
 * Détecte la configuration du site courant.
 * @returns {{ name: string, formSelector: string } | null}
 */
function detectCurrentSite() {
  var hostname = window.location.hostname;
  return SITE_CONFIGS[hostname] || null;
}

// ─── Remplissage des champs ───────────────────────────────────────────────────

/**
 * Remplit un <input> en simulant une saisie native.
 * Utilise le setter du prototype pour notifier React/Vue/Angular.
 */
function fillInputField(element, value) {
  try {
    element.focus();

    var descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input',  { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
  } catch (err) {
    // Fallback simple
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Remplit un <textarea> en simulant une saisie native.
 */
function fillTextareaField(element, value) {
  try {
    element.focus();

    var descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input',  { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
  } catch (err) {
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Remplit un <select> en cherchant l'option la plus proche (FR + EN).
 * Simule l'interaction complète pour React/Vue/Angular/SF.
 */
function fillSelectField(selectElement, profileValue) {
  var normalizedTarget = normalize(profileValue);
  var options = Array.from(selectElement.options);

  // 1. Correspondance exacte normalisée
  var match = options.find(function (o) {
    return normalize(o.text) === normalizedTarget ||
           normalize(o.value) === normalizedTarget;
  });

  // 2. Correspondance partielle (l'une contient l'autre)
  if (!match) {
    match = options.find(function (o) {
      var normText  = normalize(o.text);
      var normValue = normalize(o.value);
      return normText.includes(normalizedTarget) ||
             normalizedTarget.includes(normText) ||
             normValue.includes(normalizedTarget) ||
             normalizedTarget.includes(normValue);
    });
  }

  // 3. Alias spécifiques FR (genre, diplôme, contrat…)
  if (!match) {
    var aliases = getSelectAliases(profileValue);
    for (var i = 0; i < aliases.length && !match; i++) {
      var alias = normalize(aliases[i]);
      match = options.find(function (o) {
        return normalize(o.text) === alias ||
               normalize(o.value) === alias ||
               normalize(o.text).includes(alias);
      });
    }
  }

  if (!match) return false;

  // Simuler l'interaction complète pour React/Vue/Angular
  selectElement.focus();
  selectElement.value = match.value;
  selectElement.dispatchEvent(new Event('focus',     { bubbles: true }));
  selectElement.dispatchEvent(new Event('mousedown', { bubbles: true }));
  selectElement.dispatchEvent(new Event('input',     { bubbles: true }));
  selectElement.dispatchEvent(new Event('change',    { bubbles: true }));
  selectElement.dispatchEvent(new Event('blur',      { bubbles: true }));
  return true;
}

/**
 * Retourne des alias de correspondance pour les valeurs fréquentes des <select> FR.
 * Exemple : "Homme" → ["M.", "Monsieur", "M"]
 */
function getSelectAliases(value) {
  var lower = (value || '').toLowerCase();

  var aliasMap = {
    'homme':  ['M.', 'Monsieur', 'M', 'Mr', 'Mr.', 'H'],
    'femme':  ['Mme', 'Madame', 'F', 'Mme.'],
    'cdi':    ['Contrat à durée indéterminée', 'CDI', 'Permanent'],
    'cdd':    ['Contrat à durée déterminée', 'CDD', 'Temporary', 'Fixed term'],
    'stage':  ['Stage', 'Internship', 'Intern'],
    'alternance': ['Alternance', 'Apprentissage', 'Apprenticeship'],
    'freelance': ['Freelance', 'Indépendant', 'Contractor'],
    // ── Pays / indicatifs ──────────────────────────────────────────────────
    'france': ['FR', 'France', 'FRA', '+33', '33', 'France (+33)'],
    'maroc':  ['MA', 'Maroc', 'Morocco', 'MAR', '+212', '212'],
    'algerie': ['DZ', 'Algérie', 'Algeria', 'DZA', '+213', '213'],
    'tunisie': ['TN', 'Tunisie', 'Tunisia', 'TUN', '+216', '216'],
    'belgique': ['BE', 'Belgique', 'Belgium', 'BEL', '+32', '32'],
    'suisse': ['CH', 'Suisse', 'Switzerland', 'CHE', '+41', '41'],
    'canada': ['CA', 'Canada', 'CAN', '+1'],
    'espagne': ['ES', 'Espagne', 'Spain', 'ESP', '+34', '34'],
    'italie': ['IT', 'Italie', 'Italy', 'ITA', '+39', '39'],
    'allemagne': ['DE', 'Allemagne', 'Germany', 'DEU', '+49', '49'],
    'royaume-uni': ['GB', 'UK', 'United Kingdom', 'GBR', '+44', '44', 'Royaume-Uni'],
    // ── Diplômes ────────────────────────────────────────────────────────────
    'bac+5':  ['Master', 'Bac+5', 'Bac + 5', 'Master 2', 'Niveau I', 'Bac 5', 'Ingénieur', 'Grande école'],
    'bac+4':  ['Master 1', 'Bac+4', 'Bac + 4', 'Maîtrise', 'Niveau I'],
    'bac+3':  ['Licence', 'Bachelor', 'Bac+3', 'Bac + 3', 'Niveau II', 'Licence Pro', 'LP'],
    'bac+2':  ['BTS', 'DUT', 'BUT', 'Bac+2', 'Bac + 2', 'Niveau III', 'Bac 2'],
    'bac':    ['Baccalauréat', 'Bac', 'Niveau IV', 'Terminale']
  };

  for (var key in aliasMap) {
    if (lower.includes(key)) return aliasMap[key];
  }
  return [];
}

// ─── Détection de champ déjà rempli ──────────────────────────────────────────

function isAlreadyFilled(element) {
  return !!(element.value && element.value.trim().length > 0);
}

// ─── Utilitaires async ────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/**
 * Attend qu'un élément apparaisse dans le DOM (dropdowns lazy).
 */
function waitForElement(selector, timeout) {
  timeout = timeout || 1000;
  return new Promise(function (resolve) {
    var existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    var observer = new MutationObserver(function () {
      var el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); resolve(null); }, timeout);
  });
}

// ─── Champs date (JJ/MM/AAAA) ─────────────────────────────────────────────────

var DATE_PLACEHOLDER_PATTERNS = ['jj/mm/aaaa', 'dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd', 'jj-mm-aaaa'];

function isDateField(element) {
  if (element.type === 'date') return true;
  var placeholder = normalize(element.getAttribute('placeholder') || '');
  return DATE_PLACEHOLDER_PATTERNS.some(function (p) { return placeholder.includes(p); });
}

/**
 * Convertit une date ISO/partielle vers JJ/MM/AAAA.
 */
function toFrenchDate(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    var parts = dateStr.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    var p = dateStr.split('-');
    return '01/' + p[1] + '/' + p[0];
  }
  if (/^\d{2}\/\d{4}$/.test(dateStr)) {
    var p2 = dateStr.split('/');
    return '01/' + p2[0] + '/' + p2[1];
  }
  if (/^\d{4}$/.test(dateStr)) return '01/01/' + dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  return '';
}

/**
 * Remplit un champ date type text (JJ/MM/AAAA) caractère par caractère.
 */
async function fillDateField(element, dateStr) {
  var formattedDate = toFrenchDate(dateStr);
  if (!formattedDate) return false;

  element.focus();
  element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));

  for (var i = 0; i < formattedDate.length; i++) {
    var char = formattedDate[i];
    element.value += char;
    element.dispatchEvent(new KeyboardEvent('keydown',  { key: char, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup',    { key: char, bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(20);
  }

  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();

  await delay(100);
  var picker = document.querySelector('.datepicker, [class*="calendar"], [class*="datepicker"]');
  if (picker) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  return true;
}

// ─── Custom dropdowns ARIA ────────────────────────────────────────────────────

function isCustomDropdown(element) {
  if (!element) return false;
  var role = element.getAttribute('role');
  var haspopup = element.getAttribute('aria-haspopup');
  return role === 'combobox' || role === 'listbox' ||
    haspopup === 'listbox' || haspopup === 'true' ||
    element.classList.contains('select') ||
    element.classList.contains('dropdown');
}

async function fillCustomDropdown(triggerElement, profileValue) {
  var normalizedTarget = normalize(profileValue);

  triggerElement.click();
  triggerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  triggerElement.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));

  if (triggerElement.tagName === 'INPUT') fillInputField(triggerElement, profileValue);

  var listbox = await waitForElement('[role="listbox"], [role="option"], ul.dropdown-menu, .select-options', 1000);
  if (!listbox) return false;

  var options = Array.from(listbox.querySelectorAll('[role="option"], li, .option, [data-value]'));
  var bestMatch = null;
  for (var i = 0; i < options.length; i++) {
    var text = normalize(options[i].innerText || options[i].getAttribute('data-value') || '');
    if (text === normalizedTarget || text.includes(normalizedTarget) || normalizedTarget.includes(text)) {
      bestMatch = options[i];
      break;
    }
  }

  if (!bestMatch) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  }

  bestMatch.scrollIntoView({ block: 'nearest' });
  bestMatch.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  bestMatch.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
  bestMatch.click();
  return true;
}

// ─── Custom selects SuccessFactors ────────────────────────────────────────────

function isSFCustomSelect(element) {
  if (!element) return false;
  if (element.tagName === 'BUTTON' && element.getAttribute('aria-haspopup')) return true;
  if (element.classList.contains('select2-selection')) return true;
  if (element.closest && element.closest('.select2-container')) return true;
  if (element.getAttribute('aria-haspopup') === 'listbox') return true;
  var text = (element.innerText || '').trim().toLowerCase();
  return text === 'aucune sélection' || text === 'aucune selection';
}

async function fillSFCustomSelect(triggerElement, profileValue) {
  var normalizedTarget = normalize(profileValue);

  var clickTarget = triggerElement.closest && (
    triggerElement.closest('button') ||
    triggerElement.closest('[role="combobox"]') ||
    triggerElement.closest('.select2-selection')
  ) || triggerElement;

  clickTarget.click();
  await delay(400);

  var listSelectors = [
    '[role="listbox"]', '[role="option"]',
    '.select2-results__options', '.select2-results__option',
    'ul.dropdown-menu li', '[class*="option"]'
  ];

  var options = [];
  for (var s = 0; s < listSelectors.length; s++) {
    var found = document.querySelectorAll(listSelectors[s]);
    if (found.length > 0) { options = Array.from(found); break; }
  }

  if (options.length === 0) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  }

  var bestMatch = null;
  var bestScore = 0;
  for (var i = 0; i < options.length; i++) {
    var text = normalize(options[i].innerText || options[i].textContent || options[i].getAttribute('data-value') || '');
    var score = 0;
    if (text === normalizedTarget) score = 3;
    else if (text.includes(normalizedTarget)) score = 2;
    else if (normalizedTarget.includes(text) && text.length > 2) score = 1;
    if (score > bestScore) { bestScore = score; bestMatch = options[i]; }
  }

  if (!bestMatch) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  }

  bestMatch.scrollIntoView({ block: 'nearest' });
  await delay(100);
  bestMatch.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  bestMatch.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
  bestMatch.click();
  await delay(200);
  return true;
}

// ─── Mapping niveaux d'études SuccessFactors ──────────────────────────────────

var NIVEAU_ETUDE_MAPPING = {
  'bac':       'Baccalauréat',
  'bac+2':     'Bac+2', 'bts': 'Bac+2', 'dut': 'Bac+2', 'but': 'Bac+2',
  'bac+3':     'Bac+3', 'licence': 'Bac+3', 'bachelor': 'Bac+3',
  'bac+4':     'Bac+4', 'maitrise': 'Bac+4', 'master 1': 'Bac+4',
  'bac+5':     'Bac+5 / Master', 'master': 'Bac+5 / Master',
  'ingenieur': 'Bac+5 / Master', 'grande ecole': 'Bac+5 / Master',
  'doctorat':  'Doctorat', 'phd': 'Doctorat', 'bac+8': 'Doctorat'
};

function normalizeDiploma(value) {
  var n = normalize(value || '');
  var keys = Object.keys(NIVEAU_ETUDE_MAPPING);
  for (var i = 0; i < keys.length; i++) {
    if (n.includes(normalize(keys[i]))) return NIVEAU_ETUDE_MAPPING[keys[i]];
  }
  return value;
}

function isCurrentEmployer(experience) {
  if (!experience || !experience.dateFin) return 'Oui';
  return new Date(experience.dateFin) > new Date() ? 'Oui' : 'Non';
}

// ─── Utilitaires SuccessFactors ───────────────────────────────────────────────

function getSFFieldKey(element, mappings) {
  var name = normalize(element.getAttribute('name') || '');
  var id   = normalize(element.getAttribute('id')   || '');
  var keys = Object.keys(mappings);
  for (var i = 0; i < keys.length; i++) {
    var k = normalize(keys[i]);
    if (k === name || k === id) return mappings[keys[i]];
  }
  return null;
}

function getNestedValue(obj, path) {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .reduce(function (acc, key) {
      return (acc && acc[key] !== undefined) ? acc[key] : null;
    }, obj);
}

function findSaveButton() {
  var saveTexts = ['enregistrer', 'sauvegarder', 'save', 'valider', 'confirmer', 'ok', 'submit'];
  var buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, [type="submit"]'));
  return buttons.find(function (btn) {
    var text = normalize(btn.innerText || btn.value || btn.textContent || '');
    return saveTexts.some(function (t) { return text.includes(t); });
  }) || null;
}

// ─── Feedback visuel ─────────────────────────────────────────────────────────

/**
 * Affiche un contour vert temporaire autour du champ rempli.
 */
function showFieldFeedback(element) {
  var prevTransition  = element.style.transition;
  var prevBorder      = element.style.borderColor;
  var prevBoxShadow   = element.style.boxShadow;
  var prevOutline     = element.style.outline;

  element.style.transition   = 'border-color 0.3s, box-shadow 0.3s';
  element.style.borderColor  = '#22c55e';
  element.style.boxShadow    = '0 0 0 2px rgba(34,197,94,0.3)';
  element.style.outline      = 'none';

  setTimeout(function () {
    element.style.transition  = prevTransition;
    element.style.borderColor = prevBorder;
    element.style.boxShadow   = prevBoxShadow;
    element.style.outline     = prevOutline;
  }, 2000);
}

/**
 * Affiche un toast en bas à droite de la page avec le bilan du remplissage.
 *
 * @param {number} filledCount  - Nombre de champs effectivement remplis
 * @param {number} totalCount   - Nombre total de champs détectés
 */
function showCompletionToast(filledCount, totalCount) {
  // Supprimer un toast existant
  var existing = document.getElementById('cvgen-toast');
  if (existing) existing.remove();

  // Injecter le style d'animation (une seule fois)
  if (!document.getElementById('cvgen-toast-style')) {
    var style = document.createElement('style');
    style.id = 'cvgen-toast-style';
    style.textContent = [
      '@keyframes cvgenSlideIn {',
      '  from { opacity: 0; transform: translateY(20px); }',
      '  to   { opacity: 1; transform: translateY(0); }',
      '}',
      '@keyframes cvgenSlideOut {',
      '  from { opacity: 1; transform: translateY(0); }',
      '  to   { opacity: 0; transform: translateY(20px); }',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  var icon    = filledCount > 0 ? '✅' : '⚠️';
  var message = filledCount > 0
    ? '<strong>' + filledCount + '</strong> champ' + (filledCount > 1 ? 's' : '') +
      ' rempli' + (filledCount > 1 ? 's' : '') +
      ' sur <strong>' + totalCount + '</strong> détecté' + (totalCount > 1 ? 's' : '')
    : 'Aucun champ CVGen reconnu sur cette page';

  var toast = document.createElement('div');
  toast.id = 'cvgen-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = [
    'position: fixed',
    'bottom: 24px',
    'right: 24px',
    'z-index: 2147483647',
    'background: #1B2A4A',
    'color: white',
    'padding: 12px 20px',
    'border-radius: 8px',
    'font-family: Inter, system-ui, -apple-system, sans-serif',
    'font-size: 14px',
    'line-height: 1.4',
    'box-shadow: 0 4px 20px rgba(0,0,0,0.35)',
    'display: flex',
    'align-items: center',
    'gap: 10px',
    'animation: cvgenSlideIn 0.3s ease',
    'max-width: 320px'
  ].join(';');

  toast.innerHTML =
    '<span style="font-size:20px;flex-shrink:0">' + icon + '</span>' +
    '<span>' + message + '</span>';

  document.body.appendChild(toast);

  setTimeout(function () {
    toast.style.animation = 'cvgenSlideOut 0.3s ease forwards';
    setTimeout(function () { toast.remove(); }, 300);
  }, 4000);
}
