/**
 * CVGen Field Filler
 * Injecte les valeurs du profil dans les champs HTML des formulaires.
 * Compatible React / Vue / Angular (via les setters natifs du prototype).
 */

// ─── Configs par site ────────────────────────────────────────────────────────

var SITE_CONFIGS = {
  "fr.indeed.com": {
    name: "Indeed FR",
    formSelector: "form[data-testid], form.ia-BasePage-main, form",
  },
  "www.indeed.com": {
    name: "Indeed",
    formSelector: "form[data-testid], form.ia-BasePage-main, form",
  },
  "www.linkedin.com": {
    name: "LinkedIn",
    formSelector: ".jobs-easy-apply-modal form, form",
  },
  "www.welcometothejungle.com": {
    name: "Welcome to the Jungle",
    formSelector: "form",
  },
  "candidat.francetravail.fr": {
    name: "France Travail",
    formSelector: 'form, [role="form"]',
  },
  "app.greenhouse.io": {
    name: "Greenhouse",
    formSelector: "form#application_form, form",
  },
  "jobs.lever.co": {
    name: "Lever",
    formSelector: "form.application-form, form",
  },
};

// ─── Détection dynamique par hostname partiel (Workday, SF, Taleo…) ─────────

var DYNAMIC_SITE_PATTERNS = [
  { pattern: "workday.com",       name: "Workday",          formSelector: 'form, [data-automation-id="formPage"]' },
  { pattern: "myworkdayjobs.com", name: "Workday Jobs",     formSelector: 'form, [data-automation-id="formPage"]' },
  { pattern: "successfactors",    name: "SAP SuccessFactors", formSelector: 'form, [role="form"], .applicationForm' },
  { pattern: "taleo.net",         name: "Taleo",            formSelector: "form, .requisitionContent" },
  { pattern: "smartrecruiters",   name: "SmartRecruiters",  formSelector: "form, .application-form" },
  { pattern: "greenhouse.io",     name: "Greenhouse",       formSelector: "form#application_form, form" },
  { pattern: "lever.co",          name: "Lever",            formSelector: "form.application-form, form" },
  { pattern: "icims.com",         name: "iCIMS",            formSelector: "form" },
  { pattern: "jobvite.com",       name: "Jobvite",          formSelector: "form" },
];

/**
 * Détecte la configuration du site courant.
 * @returns {{ name: string, formSelector: string } | null}
 */
function detectCurrentSite() {
  var hostname = window.location.hostname;
  // 1. Correspondance exacte
  if (SITE_CONFIGS[hostname]) return SITE_CONFIGS[hostname];
  // 2. Correspondance par pattern partiel
  for (var i = 0; i < DYNAMIC_SITE_PATTERNS.length; i++) {
    if (hostname.includes(DYNAMIC_SITE_PATTERNS[i].pattern)) {
      return DYNAMIC_SITE_PATTERNS[i];
    }
  }
  return null;
}

// ─── Remplissage des checkboxes et radios ────────────────────────────────────

/**
 * Remplit un checkbox ou radio en cochant/décochant selon la valeur attendue.
 * @param {HTMLInputElement} element
 * @param {string} value - "Oui"/"true"/"1" → coché, sinon décoché
 * @returns {boolean}
 */
function fillCheckboxOrRadio(element, value) {
  var shouldCheck = /^(oui|yes|true|1|vrai)$/i.test((value || "").trim());

  if (element.type === "radio") {
    // Pour les radios, chercher le bon dans le groupe
    var radioName = element.getAttribute("name");
    if (radioName) {
      var radios = Array.from(document.querySelectorAll('input[type="radio"][name="' + CSS.escape(radioName) + '"]'));
      var normalizedValue = normalize(value);
      for (var i = 0; i < radios.length; i++) {
        var radioLabel = getRadioLabel(radios[i]);
        var normalizedLabel = normalize(radioLabel);
        if (normalizedLabel === normalizedValue ||
            normalizedLabel.includes(normalizedValue) ||
            normalizedValue.includes(normalizedLabel)) {
          radios[i].checked = true;
          radios[i].dispatchEvent(new Event("input",  { bubbles: true }));
          radios[i].dispatchEvent(new Event("change", { bubbles: true }));
          radios[i].dispatchEvent(new Event("click",  { bubbles: true }));
          return true;
        }
      }
      // Fallback : cocher oui/non par position
      if (radios.length === 2) {
        var idx = shouldCheck ? 0 : 1;
        radios[idx].checked = true;
        radios[idx].dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  // Checkbox simple
  if (element.checked !== shouldCheck) {
    element.checked = shouldCheck;
    element.dispatchEvent(new Event("input",  { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("click",  { bubbles: true }));
  }
  return true;
}

/**
 * Récupère le texte du label associé à un radio/checkbox.
 */
function getRadioLabel(radioEl) {
  var id = radioEl.getAttribute("id");
  if (id) {
    try {
      var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (label) return (label.innerText || label.textContent || "").trim();
    } catch (_) {}
  }
  var parentLabel = radioEl.closest("label");
  if (parentLabel) {
    var clone = parentLabel.cloneNode(true);
    clone.querySelectorAll("input").forEach(function (el) { el.remove(); });
    return (clone.innerText || clone.textContent || "").trim();
  }
  return radioEl.value || "";
}

// ─── Remplissage des champs ───────────────────────────────────────────────────

/**
 * Remplit un <input> en simulant une saisie native.
 * Utilise le setter du prototype pour notifier React/Vue/Angular.
 */
function fillInputField(element, value) {
  try {
    element.focus();

    var descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    );
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur();
  } catch (err) {
    // Fallback simple
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/**
 * Remplit un <textarea> en simulant une saisie native.
 */
function fillTextareaField(element, value) {
  try {
    element.focus();

    var descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    );
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur();
  } catch (err) {
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
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
    return (
      normalize(o.text) === normalizedTarget ||
      normalize(o.value) === normalizedTarget
    );
  });

  // 2. Correspondance partielle (l'une contient l'autre)
  if (!match) {
    match = options.find(function (o) {
      var normText = normalize(o.text);
      var normValue = normalize(o.value);
      return (
        normText.includes(normalizedTarget) ||
        normalizedTarget.includes(normText) ||
        normValue.includes(normalizedTarget) ||
        normalizedTarget.includes(normValue)
      );
    });
  }

  // 3. Alias spécifiques FR (genre, diplôme, contrat…)
  if (!match) {
    var aliases = getSelectAliases(profileValue);
    for (var i = 0; i < aliases.length && !match; i++) {
      var alias = normalize(aliases[i]);
      match = options.find(function (o) {
        return (
          normalize(o.text) === alias ||
          normalize(o.value) === alias ||
          normalize(o.text).includes(alias)
        );
      });
    }
  }

  if (!match) return false;

  // Simuler l'interaction complète pour React/Vue/Angular
  selectElement.focus();
  selectElement.value = match.value;
  selectElement.dispatchEvent(new Event("focus", { bubbles: true }));
  selectElement.dispatchEvent(new Event("mousedown", { bubbles: true }));
  selectElement.dispatchEvent(new Event("input", { bubbles: true }));
  selectElement.dispatchEvent(new Event("change", { bubbles: true }));
  selectElement.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
}

/**
 * Retourne des alias de correspondance pour les valeurs fréquentes des <select> FR.
 * Exemple : "Homme" → ["M.", "Monsieur", "M"]
 */
function getSelectAliases(value) {
  var lower = (value || "").toLowerCase();

  var aliasMap = {
    homme: ["M.", "Monsieur", "M", "Mr", "Mr.", "H"],
    femme: ["Mme", "Madame", "F", "Mme."],
    cdi: ["Contrat à durée indéterminée", "CDI", "Permanent"],
    cdd: ["Contrat à durée déterminée", "CDD", "Temporary", "Fixed term"],
    stage: ["Stage", "Internship", "Intern"],
    alternance: ["Alternance", "Apprentissage", "Apprenticeship"],
    freelance: ["Freelance", "Indépendant", "Contractor"],
    // ── Pays / indicatifs ──────────────────────────────────────────────────
    france: ["FR", "France", "FRA", "+33", "33", "France (+33)"],
    maroc: ["MA", "Maroc", "Morocco", "MAR", "+212", "212"],
    algerie: ["DZ", "Algérie", "Algeria", "DZA", "+213", "213"],
    tunisie: ["TN", "Tunisie", "Tunisia", "TUN", "+216", "216"],
    belgique: ["BE", "Belgique", "Belgium", "BEL", "+32", "32"],
    suisse: ["CH", "Suisse", "Switzerland", "CHE", "+41", "41"],
    canada: ["CA", "Canada", "CAN", "+1"],
    espagne: ["ES", "Espagne", "Spain", "ESP", "+34", "34"],
    italie: ["IT", "Italie", "Italy", "ITA", "+39", "39"],
    allemagne: ["DE", "Allemagne", "Germany", "DEU", "+49", "49"],
    "royaume-uni": [
      "GB",
      "UK",
      "United Kingdom",
      "GBR",
      "+44",
      "44",
      "Royaume-Uni",
    ],
    // ── Diplômes ────────────────────────────────────────────────────────────
    "bac+5": [
      "Master",
      "Bac+5",
      "Bac + 5",
      "Master 2",
      "Niveau I",
      "Bac 5",
      "Ingénieur",
      "Grande école",
    ],
    "bac+4": ["Master 1", "Bac+4", "Bac + 4", "Maîtrise", "Niveau I"],
    "bac+3": [
      "Licence",
      "Bachelor",
      "Bac+3",
      "Bac + 3",
      "Niveau II",
      "Licence Pro",
      "LP",
    ],
    "bac+2": ["BTS", "DUT", "BUT", "Bac+2", "Bac + 2", "Niveau III", "Bac 2"],
    bac: ["Baccalauréat", "Bac", "Niveau IV", "Terminale"],
  };

  for (var key in aliasMap) {
    if (lower.includes(key)) return aliasMap[key];
  }
  return [];
}

// ─── Détection de champ déjà rempli ──────────────────────────────────────────

var SELECT_PLACEHOLDER_PATTERNS = [
  "aucune", "sélection", "selection", "select", "choisir", "choose",
  "veuillez", "please", "-- ", "—", "...", "none", "n/a",
];

function isAlreadyFilled(element) {
  if (element.tagName === "SELECT") {
    var selectedOption = element.options && element.options[element.selectedIndex];
    if (!selectedOption) return false;
    var optText = (selectedOption.text || "").trim().toLowerCase();
    var optVal = (selectedOption.value || "").trim();
    // Option vide ou placeholder classique → pas rempli
    if (optVal === "" || optVal === "-1" || optVal === "0" || optVal === "null" || optVal === "undefined") return false;
    if (optText === "") return false;
    // Vérifier les patterns de placeholder
    for (var i = 0; i < SELECT_PLACEHOLDER_PATTERNS.length; i++) {
      if (optText.includes(SELECT_PLACEHOLDER_PATTERNS[i])) return false;
    }
    // Premier option disabled → placeholder
    if (element.selectedIndex === 0 && selectedOption.disabled) return false;
    return true;
  }
  return !!(element.value && element.value.trim().length > 0);
}

// ─── Utilitaires async ────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
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
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// ─── Champs date (JJ/MM/AAAA) ─────────────────────────────────────────────────

var DATE_PLACEHOLDER_PATTERNS = [
  "jj/mm/aaaa",
  "dd/mm/yyyy",
  "mm/dd/yyyy",
  "yyyy-mm-dd",
  "jj-mm-aaaa",
  "mm/aaaa",
  "mm/yyyy",
  "aaaa",
  "yyyy",
  "jj/mm",
  "dd/mm",
];
var DATEPICKER_CLASSES = [
  "datepicker",
  "date-picker",
  "react-datepicker",
  "flatpickr",
  "pikaday",
  "daterangepicker",
];

function isDateField(element) {
  if (element.type === "date" || element.type === "month") return true;
  var placeholder = normalize(element.getAttribute("placeholder") || "");
  if (
    DATE_PLACEHOLDER_PATTERNS.some(function (p) {
      return placeholder.includes(p);
    })
  )
    return true;
  var cls = (element.className || "").toLowerCase();
  if (
    DATEPICKER_CLASSES.some(function (c) {
      return cls.includes(c);
    })
  )
    return true;
  if (
    element.getAttribute("data-date-format") ||
    element.getAttribute("data-datepicker")
  )
    return true;
  return false;
}

/**
 * Convertit une date ISO/partielle vers JJ/MM/AAAA.
 */
function toFrenchDate(dateStr) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    var parts = dateStr.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    var p = dateStr.split("-");
    return "01/" + p[1] + "/" + p[0];
  }
  if (/^\d{2}\/\d{4}$/.test(dateStr)) {
    var p2 = dateStr.split("/");
    return "01/" + p2[0] + "/" + p2[1];
  }
  if (/^\d{4}$/.test(dateStr)) return "01/01/" + dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  return "";
}

/** Convertit en YYYY-MM-DD pour <input type="date"> */
function toISODate(dateStr) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr + "-01";
  if (/^\d{4}$/.test(dateStr)) return dateStr + "-01-01";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    var p = dateStr.split("/");
    return p[2] + "-" + p[1] + "-" + p[0];
  }
  return "";
}

/** Convertit en YYYY-MM pour <input type="month"> */
function toISOMonth(dateStr) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr.substring(0, 7);
  if (/^\d{4}$/.test(dateStr)) return dateStr + "-01";
  if (/^\d{2}\/\d{4}$/.test(dateStr)) {
    var pts = dateStr.split("/");
    return pts[1] + "-" + pts[0];
  }
  return "";
}

/** Convertit en MM/YYYY pour champs avec placeholder MM/AAAA */
function toMonthYear(dateStr) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(dateStr)) {
    var pts = dateStr.split("-");
    return pts[1] + "/" + pts[0];
  }
  if (/^\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  return "";
}

/** Extrait l'année sur 4 chiffres */
function toYearOnly(dateStr) {
  if (!dateStr) return "";
  var m = dateStr.match(/^(\d{4})/);
  return m ? m[1] : "";
}

/** Tape du texte caractère par caractère (pour datepickers custom). */
async function typeIntoField(element, text) {
  element.focus();
  element.value = "";
  element.dispatchEvent(new Event("input", { bubbles: true }));

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    element.value += ch;
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: ch,
        bubbles: true,
        cancelable: true,
      }),
    );
    element.dispatchEvent(
      new KeyboardEvent("keypress", {
        key: ch,
        bubbles: true,
        cancelable: true,
      }),
    );
    element.dispatchEvent(
      new KeyboardEvent("keyup", { key: ch, bubbles: true, cancelable: true }),
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
    await delay(20);
  }

  element.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
  );
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.blur();

  await delay(100);
  var picker = document.querySelector(
    '.datepicker, [class*="calendar"], [class*="datepicker"]',
  );
  if (picker)
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

  return true;
}

/**
 * Remplit un champ date selon son type :
 * - <input type="date">  → YYYY-MM-DD
 * - <input type="month"> → YYYY-MM
 * - placeholder MM/AAAA → MM/YYYY
 * - placeholder AAAA    → année seule
 * - autres              → JJ/MM/AAAA caractère par caractère
 */
async function fillDateField(element, dateStr) {
  if (!dateStr) return false;

  // ── 1. <input type="date"> → YYYY-MM-DD ─────────────────────────────────
  if (element.type === "date") {
    var iso = toISODate(dateStr);
    if (!iso) return false;
    fillInputField(element, iso);
    return true;
  }

  // ── 2. <input type="month"> → YYYY-MM ───────────────────────────────────
  if (element.type === "month") {
    var isoM = toISOMonth(dateStr);
    if (!isoM) return false;
    fillInputField(element, isoM);
    return true;
  }

  var ph = normalize(element.getAttribute("placeholder") || "");

  // ── 3. MM/AAAA ou MM/YYYY ───────────────────────────────────────────────
  if (
    ph.includes("mm/aaaa") ||
    ph.includes("mm/yyyy") ||
    ph.includes("mm / aaaa") ||
    ph.includes("mm / yyyy")
  ) {
    var mmy = toMonthYear(dateStr);
    if (!mmy) return false;
    return await typeIntoField(element, mmy);
  }

  // ── 4. Année seule ───────────────────────────────────────────────────────
  if (ph === "aaaa" || ph === "yyyy" || ph === "annee" || ph === "year") {
    var yr = toYearOnly(dateStr);
    if (!yr) return false;
    fillInputField(element, yr);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // ── 5. Par défaut : JJ/MM/AAAA caractère par caractère ─────────────────
  var formattedDate = toFrenchDate(dateStr);
  if (!formattedDate) return false;
  return await typeIntoField(element, formattedDate);
}

// ─── Champs téléphone avec indicatif pays ────────────────────────────────────

/**
 * Remplit un champ téléphone. Détecte un éventuel select d'indicatif pays dans
 * le même container et le remplit avec France / +33.
 */
function fillPhoneField(element, phone) {
  if (!phone) return false;

  var container =
    element.closest(
      '[class*="phone"], [class*="tel"], [class*="telephone"], fieldset, .form-group, .field-group, .field',
    ) || element.parentElement;

  if (container) {
    var countryInputs = Array.from(
      container.querySelectorAll(
        'select, input[type="tel"][maxlength="4"], [role="combobox"]',
      ),
    ).filter(function (el) {
      return el !== element;
    });

    if (countryInputs.length > 0) {
      var countryEl = countryInputs[0];
      if (countryEl.tagName === "SELECT") {
        fillSelectField(countryEl, "France");
      } else if (countryEl.tagName === "INPUT") {
        fillInputField(countryEl, "+33");
      }
      // Garder le format national 06XXXXXXXX
      var national = phone
        .replace(/^\+33\s?/, "0")
        .replace(/^0033\s?/, "0")
        .replace(/[\s\-\.]/g, "");
      fillInputField(element, national);
      return true;
    }
  }

  fillInputField(element, phone);
  return true;
}

// ─── Custom dropdowns ARIA ────────────────────────────────────────────────────

function isCustomDropdown(element) {
  if (!element) return false;
  var role = element.getAttribute("role");
  var haspopup = element.getAttribute("aria-haspopup");
  return (
    role === "combobox" ||
    role === "listbox" ||
    haspopup === "listbox" ||
    haspopup === "true" ||
    element.classList.contains("select") ||
    element.classList.contains("dropdown")
  );
}

async function fillCustomDropdown(triggerElement, profileValue) {
  var normalizedTarget = normalize(profileValue);

  triggerElement.click();
  triggerElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  triggerElement.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

  if (triggerElement.tagName === "INPUT")
    fillInputField(triggerElement, profileValue);

  var listbox = await waitForElement(
    '[role="listbox"], [role="option"], ul.dropdown-menu, .select-options',
    1000,
  );
  if (!listbox) return false;

  var options = Array.from(
    listbox.querySelectorAll('[role="option"], li, .option, [data-value]'),
  );
  var bestMatch = null;
  for (var i = 0; i < options.length; i++) {
    var text = normalize(
      options[i].innerText || options[i].getAttribute("data-value") || "",
    );
    if (
      text === normalizedTarget ||
      text.includes(normalizedTarget) ||
      normalizedTarget.includes(text)
    ) {
      bestMatch = options[i];
      break;
    }
  }

  if (!bestMatch) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    return false;
  }

  bestMatch.scrollIntoView({ block: "nearest" });
  bestMatch.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  bestMatch.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  bestMatch.click();
  return true;
}

// ─── SuccessFactors Paginated Picklist ────────────────────────────────────────

/**
 * Détecte si un input est un picklist paginé SF (autocomplete avec dropdown).
 * Ces éléments ont aria-owns pointant vers une listbox, ou sont dans un
 * container .paginatedPicklistContainer, ou ont la classe rcmpaginated*.
 */
function isSFPaginatedPicklist(element) {
  if (!element || element.tagName !== "INPUT") return false;
  // Classe spécifique SF
  var cls = (element.className || "").toLowerCase();
  if (cls.includes("rcmpaginated") || cls.includes("paginatedpicklist") || cls.includes("picklist")) return true;
  // aria-owns pointant vers une listbox
  if (element.getAttribute("aria-owns")) return true;
  // Container parent
  var container = element.closest && (
    element.closest(".paginatedPicklistContainer") ||
    element.closest('[class*="paginatedPicklist"]') ||
    element.closest('[class*="picklist"]')
  );
  if (container) return true;
  // role=combobox sur l'input ou un parent proche
  if (element.getAttribute("role") === "combobox") return true;
  if (element.getAttribute("aria-haspopup")) return true;
  return false;
}

/**
 * Remplit un picklist paginé SF : ouvre le dropdown, cherche l'option, clique.
 * @param {HTMLInputElement} inputEl
 * @param {string} value
 * @returns {Promise<boolean>}
 */
async function fillSFPaginatedPicklist(inputEl, value) {
  var normalizedTarget = normalize(value);

  // 1. Ouvrir le dropdown : focus + click
  inputEl.focus();
  inputEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  inputEl.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  inputEl.click();
  await delay(600);

  // 2. Chercher le container de la liste (approche GLOBALE — pas de CSS.escape sur IDs SF)
  //    On cherche tout élément de liste visible dans le document.
  var listContainers = document.querySelectorAll(
    '[role="listbox"], ul[class*="picklist"], ul[class*="Picklist"], ' +
    'ul[class*="dropdown"], ul[class*="list-group"], ' +
    'div[class*="picklist"] ul, div[class*="Picklist"] ul'
  );

  // Si aria-owns est défini, essayer de trouver l'élément par ID directement
  var listId = inputEl.getAttribute("aria-owns");
  var ariaContainer = null;
  if (listId) {
    // Essai direct par getElementById (pas besoin de CSS.escape)
    ariaContainer = document.getElementById(listId);
    // SF met parfois juste le préfixe dans aria-owns, le vrai ID peut être plus long
    if (!ariaContainer) {
      // Chercher un ID qui commence par ce prefix
      var allUls = document.querySelectorAll("ul[id]");
      for (var u = 0; u < allUls.length; u++) {
        if (allUls[u].id.indexOf(listId.replace(/_li.*$/, "")) === 0) {
          ariaContainer = allUls[u];
          break;
        }
      }
    }
  }

  // 3. Collecter TOUS les items <li> visibles dans les listes trouvées
  var items = [];

  if (ariaContainer) {
    items = Array.from(ariaContainer.querySelectorAll("li"));
    Logger.debug("SF Picklist: container aria trouvé avec " + items.length + " items");
  }

  if (items.length === 0 && listContainers.length > 0) {
    for (var lc = 0; lc < listContainers.length; lc++) {
      var lcItems = Array.from(listContainers[lc].querySelectorAll("li"));
      if (lcItems.length > 3) {
        items = lcItems;
        Logger.debug("SF Picklist: container générique trouvé avec " + items.length + " items");
        break;
      }
    }
  }

  // Fallback : chercher TOUS les li et [role=option] dans le document entier
  if (items.length === 0) {
    items = Array.from(document.querySelectorAll('[role="option"]'));
    Logger.debug("SF Picklist: fallback role=option → " + items.length + " items");
  }

  if (items.length === 0) {
    Logger.warn("SF Picklist: aucune liste trouvée pour '" + value + "'");
    inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }

  // 4. Chercher la meilleure correspondance
  var bestMatch = null;
  var bestScore = 0;

  for (var j = 0; j < items.length; j++) {
    var itemText = normalize(items[j].innerText || items[j].textContent || "");
    if (!itemText || itemText.length < 2) continue;
    var score = 0;
    if (itemText === normalizedTarget) score = 4;
    else if (itemText === normalizedTarget || itemText.replace(/\s*\(.*\)/, "") === normalizedTarget) score = 3;
    else if (itemText.includes(normalizedTarget)) score = 2;
    else if (normalizedTarget.includes(itemText) && itemText.length > 3) score = 1;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = items[j];
    }
  }

  // Essayer les aliases si pas de match
  if (!bestMatch) {
    var aliases = getSelectAliases(value);
    for (var a = 0; a < aliases.length && !bestMatch; a++) {
      var normalizedAlias = normalize(aliases[a]);
      for (var k = 0; k < items.length; k++) {
        var optText = normalize(items[k].innerText || items[k].textContent || "");
        if (optText === normalizedAlias || optText.includes(normalizedAlias)) {
          bestMatch = items[k];
          break;
        }
      }
    }
  }

  if (!bestMatch) {
    Logger.warn("SF Picklist: '" + value + "' non trouvé parmi " + items.length + " items");
    inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }

  // 5. Scroller vers l'option et cliquer
  Logger.debug("SF Picklist: match trouvé → '" + (bestMatch.innerText || "").trim().substring(0, 30) + "'");
  bestMatch.scrollIntoView({ block: "nearest" });
  await delay(150);

  // Simuler un vrai clic utilisateur
  bestMatch.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  await delay(50);
  bestMatch.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
  bestMatch.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  bestMatch.click();
  await delay(400);

  // Vérifier si le dropdown s'est fermé, sinon forcer Escape
  var stillOpen = document.querySelector('[role="listbox"]:not([hidden]), ul[class*="picklist"]:not([hidden])');
  if (stillOpen) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await delay(200);
  }

  return true;
}

// ─── Custom selects SuccessFactors ────────────────────────────────────────────

function isSFCustomSelect(element) {
  if (!element) return false;
  if (element.tagName === "BUTTON" && element.getAttribute("aria-haspopup"))
    return true;
  if (element.classList.contains("select2-selection")) return true;
  if (element.closest && element.closest(".select2-container")) return true;
  if (element.getAttribute("aria-haspopup") === "listbox") return true;
  var text = (element.innerText || "").trim().toLowerCase();
  return text === "aucune sélection" || text === "aucune selection";
}

async function fillSFCustomSelect(triggerElement, profileValue) {
  var normalizedTarget = normalize(profileValue);

  var clickTarget =
    (triggerElement.closest &&
      (triggerElement.closest("button") ||
        triggerElement.closest('[role="combobox"]') ||
        triggerElement.closest(".select2-selection"))) ||
    triggerElement;

  clickTarget.click();
  // Attendre que les options apparaissent réellement (max 1500ms)
  var listboxReady = await waitForElement('[role="option"], [role="listbox"], .select2-results__option', 1500);
  if (!listboxReady) {
    // Dropdown pas ouvert — tenter mousedown/mouseup
    clickTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    clickTarget.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
    listboxReady = await waitForElement('[role="option"], [role="listbox"], .select2-results__option', 1000);
  }
  if (!listboxReady) {
    return false;
  }

  // ── Trouver les options individuelles ────────────────────────────────────
  // Stratégie : chercher d'abord un conteneur listbox, puis ses enfants.
  // Si on prend directement [role="listbox"], on clique le conteneur, pas l'option.
  function collectOptions() {
    var opts = [];
    // 1. Enfants directs d'un listbox
    var listbox = document.querySelector('[role="listbox"]');
    if (listbox) {
      opts = Array.from(listbox.querySelectorAll('[role="option"], li, div[class*="option"]'));
      if (opts.length > 0) return opts;
      // Le listbox lui-même pourrait être une option si role=option
      if (listbox.getAttribute('role') === 'option') opts = [listbox];
    }
    // 2. Options ARIA directes
    opts = Array.from(document.querySelectorAll('[role="option"]'));
    if (opts.length > 0) return opts;
    // 3. select2
    opts = Array.from(document.querySelectorAll('.select2-results__option'));
    if (opts.length > 0) return opts;
    // 4. Menus génériques
    opts = Array.from(document.querySelectorAll('ul.dropdown-menu li'));
    if (opts.length > 0) return opts;
    // 5. Tout élément avec "option" dans la classe (en dernier recours)
    opts = Array.from(document.querySelectorAll('[class*="Option"]:not(select)'));
    return opts;
  }

  var options = collectOptions();

  if (options.length === 0) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    return false;
  }

  // Tenter de taper dans un champ de recherche du dropdown (SF a souvent un input search)
  var searchInput = document.querySelector(
    '.select2-search__field, [role="searchbox"], input.search-field, ' +
    '[class*="dropdown"] input[type="text"], [class*="dropdown"] input[type="search"]'
  );
  if (searchInput) {
    fillInputField(searchInput, profileValue);
    await delay(400);
    options = collectOptions();
  }

  var bestMatch = null;
  var bestScore = 0;
  for (var i = 0; i < options.length; i++) {
    var text = normalize(
      options[i].innerText ||
        options[i].textContent ||
        options[i].getAttribute("data-value") ||
        "",
    );
    var score = 0;
    if (text === normalizedTarget) score = 3;
    else if (text.includes(normalizedTarget)) score = 2;
    else if (normalizedTarget.includes(text) && text.length > 2) score = 1;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = options[i];
    }
  }

  // Si pas de match direct, essayer avec les aliases (pays, genre, diplôme…)
  if (!bestMatch) {
    var aliases = getSelectAliases(profileValue);
    for (var a = 0; a < aliases.length && !bestMatch; a++) {
      var normalizedAlias = normalize(aliases[a]);
      for (var j = 0; j < options.length; j++) {
        var optText = normalize(
          options[j].innerText || options[j].textContent || ""
        );
        if (optText === normalizedAlias || optText.includes(normalizedAlias) || normalizedAlias.includes(optText)) {
          bestMatch = options[j];
          break;
        }
      }
    }
  }

  if (!bestMatch) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    return false;
  }

  bestMatch.scrollIntoView({ block: "nearest" });
  await delay(100);
  bestMatch.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  bestMatch.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  bestMatch.click();
  await delay(200);
  return true;
}

// ─── Mapping niveaux d'études SuccessFactors ──────────────────────────────────

var NIVEAU_ETUDE_MAPPING = {
  bac: "Baccalauréat",
  "bac+2": "Bac+2",
  bts: "Bac+2",
  dut: "Bac+2",
  but: "Bac+2",
  "bac+3": "Bac+3",
  licence: "Bac+3",
  bachelor: "Bac+3",
  "bac+4": "Bac+4",
  maitrise: "Bac+4",
  "master 1": "Bac+4",
  "bac+5": "Bac+5 / Master",
  master: "Bac+5 / Master",
  ingenieur: "Bac+5 / Master",
  "grande ecole": "Bac+5 / Master",
  doctorat: "Doctorat",
  phd: "Doctorat",
  "bac+8": "Doctorat",
};

function normalizeDiploma(value) {
  var n = normalize(value || "");
  var keys = Object.keys(NIVEAU_ETUDE_MAPPING);
  for (var i = 0; i < keys.length; i++) {
    if (n.includes(normalize(keys[i]))) return NIVEAU_ETUDE_MAPPING[keys[i]];
  }
  return value;
}

function isCurrentEmployer(experience) {
  if (!experience || !experience.dateFin) return "Oui";
  return new Date(experience.dateFin) > new Date() ? "Oui" : "Non";
}

// ─── Utilitaires SuccessFactors ───────────────────────────────────────────────

function getSFFieldKey(element, mappings) {
  var name = normalize(element.getAttribute("name") || "");
  var id = normalize(element.getAttribute("id") || "");
  var keys = Object.keys(mappings);
  for (var i = 0; i < keys.length; i++) {
    var k = normalize(keys[i]);
    if (k === name || k === id) return mappings[keys[i]];
  }
  return null;
}

function getNestedValue(obj, path) {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce(function (acc, key) {
      return acc && acc[key] !== undefined ? acc[key] : null;
    }, obj);
}

function findSaveButton() {
  var saveTexts = [
    "enregistrer",
    "sauvegarder",
    "save",
    "valider",
    "confirmer",
    "ok",
    "submit",
  ];
  var buttons = Array.from(
    document.querySelectorAll(
      'button, input[type="submit"], a.btn, [type="submit"]',
    ),
  );
  return (
    buttons.find(function (btn) {
      var text = normalize(btn.innerText || btn.value || btn.textContent || "");
      return saveTexts.some(function (t) {
        return text.includes(t);
      });
    }) || null
  );
}

// ─── Feedback visuel ─────────────────────────────────────────────────────────

/**
 * Affiche un contour vert temporaire autour du champ rempli.
 */
function showFieldFeedback(element) {
  var prevTransition = element.style.transition;
  var prevBorder = element.style.borderColor;
  var prevBoxShadow = element.style.boxShadow;
  var prevOutline = element.style.outline;

  element.style.transition = "border-color 0.3s, box-shadow 0.3s";
  element.style.borderColor = "#22c55e";
  element.style.boxShadow = "0 0 0 2px rgba(34,197,94,0.3)";
  element.style.outline = "none";

  setTimeout(function () {
    element.style.transition = prevTransition;
    element.style.borderColor = prevBorder;
    element.style.boxShadow = prevBoxShadow;
    element.style.outline = prevOutline;
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
  var existing = document.getElementById("cvgen-toast");
  if (existing) existing.remove();

  // Injecter le style d'animation (une seule fois)
  if (!document.getElementById("cvgen-toast-style")) {
    var style = document.createElement("style");
    style.id = "cvgen-toast-style";
    style.textContent = [
      "@keyframes cvgenSlideIn {",
      "  from { opacity: 0; transform: translateY(20px); }",
      "  to   { opacity: 1; transform: translateY(0); }",
      "}",
      "@keyframes cvgenSlideOut {",
      "  from { opacity: 1; transform: translateY(0); }",
      "  to   { opacity: 0; transform: translateY(20px); }",
      "}",
    ].join("");
    document.head.appendChild(style);
  }

  var icon = filledCount > 0 ? "✅" : "⚠️";
  var message =
    filledCount > 0
      ? "<strong>" +
        filledCount +
        "</strong> champ" +
        (filledCount > 1 ? "s" : "") +
        " rempli" +
        (filledCount > 1 ? "s" : "") +
        " sur <strong>" +
        totalCount +
        "</strong> détecté" +
        (totalCount > 1 ? "s" : "")
      : "Aucun champ CVGen reconnu sur cette page";

  var toast = document.createElement("div");
  toast.id = "cvgen-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.cssText = [
    "position: fixed",
    "bottom: 24px",
    "right: 24px",
    "z-index: 2147483647",
    "background: #1B2A4A",
    "color: white",
    "padding: 12px 20px",
    "border-radius: 8px",
    "font-family: Inter, system-ui, -apple-system, sans-serif",
    "font-size: 14px",
    "line-height: 1.4",
    "box-shadow: 0 4px 20px rgba(0,0,0,0.35)",
    "display: flex",
    "align-items: center",
    "gap: 10px",
    "animation: cvgenSlideIn 0.3s ease",
    "max-width: 320px",
  ].join(";");

  toast.innerHTML =
    '<span style="font-size:20px;flex-shrink:0">' +
    icon +
    "</span>" +
    "<span>" +
    message +
    "</span>";

  document.body.appendChild(toast);

  setTimeout(function () {
    toast.style.animation = "cvgenSlideOut 0.3s ease forwards";
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 4000);
}
