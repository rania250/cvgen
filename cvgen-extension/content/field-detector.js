/**
 * CVGen Field Detector
 * Identifie le type de champ CVGen d'un élément HTML de formulaire.
 * Supporte les formulaires FR et EN : Indeed, LinkedIn, WTTJ, France Travail,
 * Greenhouse, Lever, Workday et les portails carrière génériques.
 */

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Normalise une chaîne pour la comparaison :
 * - minuscules
 * - supprime les accents (é→e, è→e, à→a…)
 * - remplace la ponctuation par des espaces
 * - collapse les espaces multiples
 */
function normalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-z0-9\s]/g, " ") // ponctuation → espace
    .replace(/\s+/g, " ") // espaces multiples → un seul
    .trim();
}

// ─── Dictionnaire de mappings FR + EN ────────────────────────────────────────

var FIELD_MAPPINGS = {
  // ── IDENTITÉ ──────────────────────────────────────────────────────────────

  prenom: [
    "prénom",
    "prenom",
    "votre prénom",
    "votre prenom",
    "prénom *",
    "prénom*",
    "prénom officiel",
    "prenom officiel",
    "prénom d usage",
    "prenom d usage",
    "first name",
    "firstname",
    "given name",
    "forename",
    "first",
    "legal first name",
    "preferred first name",
    "first legal name",
    "legalnamefirstname",
    "legalnamesection firstname",
    "preferredfirstname",
    "fname",
    "contact firstname",
  ],

  nom: [
    "nom",
    "nom de famille",
    "nom *",
    "votre nom",
    "nom officiel",
    "deuxième prénom officiel",
    "last name",
    "lastname",
    "surname",
    "family name",
    "last",
    "legal last name",
    "legal name",
    "legalnamelastname",
    "legalnamesection lastname",
    "legalnamesection familyname",
    "lname",
    "contact lastname",
  ],

  nom_complet: [
    "nom complet",
    "nom et prénom",
    "prénom et nom",
    "full name",
    "your name",
    "name",
    "nom et prenom",
    "prenom et nom",
  ],

  email: [
    "email",
    "e-mail",
    "adresse email",
    "adresse e-mail",
    "adresse mail",
    "adresse electronique",
    "adresse électronique",
    "courriel",
    "adresse e mail correcte",
    "adresse e-mail correcte",
    "votre email",
    "votre adresse email",
    "email address",
    "your email",
    "mail",
    "work email",
    "contact email",
    "emailaddress",
    "emailsection emailaddress",
    "primary email",
    "personal email",
  ],

  telephone: [
    "téléphone",
    "telephone",
    "tel",
    "tél",
    "numéro de téléphone",
    "numero de telephone",
    "numéro de téléphone",
    "numero de telephone",
    "téléphone mobile",
    "telephone mobile",
    "mobile",
    "portable",
    "numéro de portable",
    "numero de portable",
    "numéro de mobile",
    "numéro de contact",
    "coordonnées téléphoniques",
    "phone",
    "phone number",
    "mobile number",
    "cell phone",
    "cell",
    "telephone number",
    "contact number",
    "work phone",
    "phonenumber",
    "phone device type",
    "phonesection phonenumber",
    "mobilenumber",
  ],

  adresse: [
    "adresse",
    "adresse postale",
    "adresse de résidence",
    "rue",
    "numéro et rue",
    "voie",
    "adresse ligne 1",
    "adresse 1",
    "address",
    "street address",
    "address line 1",
    "street",
    "home address",
    "mailing address",
    "residential address",
    "addressline1",
    "addressline 1",
    "addresssection addressline1",
  ],

  ville: [
    "ville",
    "commune",
    "localité",
    "ville de résidence",
    "votre ville",
    "city",
    "town",
    "municipality",
    "addresscity",
    "addresssection city",
  ],

  code_postal: [
    "code postal",
    "cp",
    "code post",
    "c p",
    "postal code",
    "zip",
    "zip code",
    "postcode",
    "postalcode",
    "addresspostalcode",
    "addresssection postalcode",
  ],

  pays: [
    "pays",
    "pays de résidence",
    "pays actuel",
    "pays pour lequel vous postulez",
    "country",
    "country of residence",
    "country of application",
    "home country",
    "countryregion",
    "addresscountryregion",
    "addresssection countryregion",
  ],

  indicatif_telephone: [
    "code de pays",
    "code pays",
    "indicatif",
    "indicatif téléphonique",
    "indicatif pays",
    "phone country code",
    "country code",
    "country phone",
    "phone device type",
    "dialing code",
  ],

  region: [
    "région",
    "departement",
    "département",
    "province",
    "state",
    "region",
    "county",
  ],

  // ── PROFIL PROFESSIONNEL ───────────────────────────────────────────────────

  titre_poste: [
    "titre du poste",
    "intitulé du poste",
    "poste actuel",
    "poste souhaité",
    "poste recherché",
    "titre professionnel",
    "votre fonction",
    "fonction actuelle",
    "fonction",
    "métier",
    "profession",
    "job title",
    "current title",
    "position",
    "title",
    "role",
    "current position",
    "current role",
  ],

  resume_professionnel: [
    "résumé",
    "resume",
    "présentation",
    "présentation personnelle",
    "à propos de vous",
    "a propos de vous",
    "qui êtes-vous",
    "parlez-nous de vous",
    "parlez nous de vous",
    "votre profil",
    "profil",
    "bio",
    "biographie",
    "décrivez-vous",
    "décrivez vous",
    "summary",
    "about",
    "about me",
    "about you",
    "profile",
    "professional summary",
  ],

  annees_experience: [
    "années d expérience",
    "annees d experience",
    "nombre d années d expérience",
    "expérience professionnelle",
    "niveau d expérience",
    "years of experience",
    "experience level",
    "seniority",
  ],

  niveau_etudes: [
    "niveau d études",
    "niveau d etudes",
    "niveau de formation",
    "diplôme",
    "diplome",
    "niveau scolaire",
    "niveau d éducation",
    "education level",
    "degree",
    "highest education",
    "highest degree",
    "qualification",
  ],

  // ── CANDIDATURE ────────────────────────────────────────────────────────────

  lettre_motivation: [
    "lettre de motivation",
    "message de motivation",
    "motivation",
    "votre message",
    "message",
    "message au recruteur",
    "pourquoi nous rejoindre",
    "pourquoi postuler",
    "pourquoi ce poste vous intéresse",
    "pourquoi êtes vous intéressé",
    "exprimez votre motivation",
    "vos motivations",
    "décrivez votre candidature",
    "présentez votre candidature",
    "commentaire",
    "remarques",
    "informations complémentaires",
    "informations supplémentaires",
    "autres informations",
    "cover letter",
    "motivation letter",
    "why do you want to join",
    "why are you interested",
    "why this role",
    "tell us about yourself",
    "additional information",
    "message to hiring manager",
  ],

  disponibilite: [
    "disponibilité",
    "disponible à partir de",
    "date de disponibilité",
    "date de début souhaitée",
    "quand pouvez vous commencer",
    "prise de poste",
    "date de prise de poste",
    "préavis",
    "durée du préavis",
    "availability",
    "available from",
    "start date",
    "notice period",
    "earliest start date",
    "when can you start",
  ],

  salaire: [
    "prétention salariale",
    "pretention salariale",
    "salaire souhaité",
    "salaire désiré",
    "salaire attendu",
    "rémunération souhaitée",
    "remuneration souhaitee",
    "rémunération attendue",
    "package souhaité",
    "salaire annuel brut souhaité",
    "expected salary",
    "desired salary",
    "salary expectation",
    "salary requirements",
    "compensation",
    "expected compensation",
  ],

  type_contrat: [
    "type de contrat",
    "contrat recherché",
    "type de poste",
    "cdi",
    "cdd",
    "alternance",
    "stage",
    "freelance",
    "contract type",
    "employment type",
    "job type",
  ],

  // ── LIENS & RÉSEAUX ────────────────────────────────────────────────────────

  linkedin: [
    "linkedin",
    "profil linkedin",
    "url linkedin",
    "lien linkedin",
    "linkedin url",
    "linkedin profile",
  ],

  portfolio: [
    "portfolio",
    "site web",
    "site personnel",
    "site internet",
    "lien portfolio",
    "url portfolio",
    "website",
    "personal website",
    "personal site",
  ],

  github: [
    "github",
    "gitlab",
    "bitbucket",
    "lien github",
    "profil github",
    "github url",
  ],

  // ── ÉGALITÉ & DIVERSITÉ ────────────────────────────────────────────────────

  genre: [
    "civilité",
    "civilite",
    "genre",
    "sexe",
    "madame",
    "monsieur",
    "mme",
    "m ",
    "gender",
    "salutation",
    "title",
  ],

  handicap: [
    "rqth",
    "travailleur handicapé",
    "reconnaissance handicap",
    "bénéficiaire de l obligation d emploi",
  ],

  // ── EXPÉRIENCE (sous-champs) ───────────────────────────────────────────────

  date_debut: [
    "date de début",
    "date debut",
    "début",
    "date de commencement",
    "start date",
    "from",
    "date from",
    "employment start",
  ],

  date_fin: [
    "date de fin",
    "date fin",
    "fin",
    "jusqu a",
    "jusqu au",
    "end date",
    "to",
    "date to",
    "employment end",
  ],

  employeur_actuel: [
    "employeur actuel",
    "poste actuel",
    "emploi actuel",
    "en poste",
    "current employer",
    "current job",
    "still employed",
    "currently employed",
  ],

  // ── FORMATION (sous-champs) ────────────────────────────────────────────────

  nom_formation: [
    "nom de la formation",
    "nom formation",
    "intitule de la formation",
    "intitule du diplome",
    "titre de la formation",
    "titre du diplome",
    "formation name",
    "degree name",
    "program name",
    "course name",
  ],

  date_diplome: [
    "date d obtention du diplome",
    "date d obtention du diplôme",
    "date d obtention",
    "annee d obtention",
    "date du diplome",
    "graduation date",
    "date of graduation",
    "completion year",
    "year graduated",
    "completion date",
  ],

  domaine_etude: [
    "domaine d etude",
    "domaine d'etude",
    "domaine",
    "specialite",
    "filiere",
    "mention",
    "field of study",
    "major",
    "specialization",
    "subject",
    "discipline",
  ],

  ecole: [
    "ecole",
    "universite",
    "institut",
    "etablissement",
    "ecole universite institut de formation",
    "nom de l ecole",
    "school",
    "university",
    "institution",
    "college",
    "institute",
  ],

  diplome_plus_eleve: [
    "s agit il de votre diplome le plus eleve",
    "diplome le plus eleve",
    "highest degree",
    "highest qualification",
  ],

  // ── CHAMPS SUPPLÉMENTAIRES ────────────────────────────────────────────────

  date_naissance: [
    "date de naissance", "naissance", "né le", "ne le", "ne(e) le",
    "date of birth", "dob", "birth date", "birthday", "born on",
    "dateofbirth", "birthdate",
  ],

  nationalite: [
    "nationalité", "nationalite", "citoyenneté", "citoyennete",
    "nationality", "citizenship", "citizen",
  ],

  competences: [
    "compétences", "competences", "compétences clés", "savoir faire",
    "technologies", "outils", "langages", "frameworks",
    "skills", "key skills", "technical skills", "core competencies",
    "tools", "technologies",
  ],

  langues: [
    "langue", "langues", "langues parlées", "langues pratiquées",
    "language", "languages", "spoken languages", "language skills",
  ],

  permis: [
    "permis", "permis de conduire", "permis b",
    "driving license", "driver license", "driving licence",
  ],

  autorisation_travail: [
    "autorisation de travail", "droit de travailler",
    "êtes vous autorisé à travailler", "etes vous autorise a travailler",
    "work authorization", "work authorisation", "work permit",
    "legally authorized to work", "right to work",
    "authorized to work", "authorised to work",
    "eligibility to work", "eligible to work",
  ],

  source_candidature: [
    "comment avez vous connu", "comment avez-vous entendu",
    "source de candidature", "source", "comment nous avez vous trouve",
    "how did you hear", "how did you find", "referral source",
    "where did you hear", "source of application",
  ],
};

// ─── Filtres : champs à ignorer ───────────────────────────────────────────────

var IGNORED_TYPES = [
  "password",
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "color",
  "range",
];
var IGNORED_NAME_PATTERNS = [
  /csrf/i,
  /token/i,
  /captcha/i,
  /honeypot/i,
  /_method/i,
  /recaptcha/i,
];

/**
 * Retourne true si l'élément doit être ignoré.
 */
function shouldIgnore(element) {
  if (IGNORED_TYPES.indexOf(element.type) !== -1) return true;
  // file inputs sont gérés séparément par FileUploader
  if (element.type === "file") return true;

  try {
    var style = getComputedStyle(element);
    if (style.display === "none") return true;
    if (style.visibility === "hidden") return true;
    // Champs de taille zéro (honeypot)
    if (parseInt(style.width) === 0 && parseInt(style.height) === 0) return true;
  } catch (_) {
    // getComputedStyle peut échouer dans certains contextes (shadow DOM)
  }

  var name = element.getAttribute("name") || "";
  if (
    IGNORED_NAME_PATTERNS.some(function (p) {
      return p.test(name);
    })
  )
    return true;

  return false;
}

// ─── Algorithme de détection multi-sources ────────────────────────────────────

/**
 * Retourne le type de champ CVGen pour un élément HTML, ou null si non reconnu.
 * Cherche dans : attributs directs, labels associés, texte des parents, aria.
 *
 * @param {HTMLElement} element
 * @returns {string|null}
 */
function detectFieldType(element) {
  var candidates = [];

  // 1. Attributs directs de l'élément
  candidates.push(element.getAttribute("name") || "");
  candidates.push(element.getAttribute("id") || "");
  candidates.push(element.getAttribute("placeholder") || "");
  candidates.push(element.getAttribute("autocomplete") || "");
  candidates.push(element.getAttribute("aria-label") || "");
  candidates.push(element.getAttribute("data-label") || "");
  candidates.push(element.getAttribute("data-field") || "");
  candidates.push(element.getAttribute("data-testid") || "");
  candidates.push(element.getAttribute("data-automation-id") || "");
  candidates.push(element.getAttribute("data-field-name") || "");
  candidates.push(element.getAttribute("data-uxi-widget-id") || "");
  candidates.push(element.getAttribute("data-qa") || "");

  // 2. Label associé via for/id
  var id = element.getAttribute("id");
  if (id) {
    try {
      var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (label) candidates.push(label.innerText || label.textContent || "");
    } catch (_) {}
  }

  // 3. Label parent direct (<label><input>...</label>)
  var parentLabel = element.closest("label");
  if (parentLabel) {
    var clone1 = parentLabel.cloneNode(true);
    clone1.querySelectorAll("input, textarea, select").forEach(function (el) {
      el.remove();
    });
    candidates.push(clone1.innerText || clone1.textContent || "");
  }

  // 4. Texte du parent immédiat (sans le texte de l'input)
  var parent = element.parentElement;
  if (parent) {
    var clone2 = parent.cloneNode(true);
    clone2.querySelectorAll("input, textarea, select").forEach(function (el) {
      el.remove();
    });
    candidates.push(
      (clone2.innerText || clone2.textContent || "").split("\n")[0],
    );
  }

  // 5. Texte du grand-parent — première ligne seulement (Indeed FR, WTTJ)
  var grandParent =
    element.parentElement && element.parentElement.parentElement;
  if (grandParent) {
    var clone3 = grandParent.cloneNode(true);
    clone3
      .querySelectorAll("input, textarea, select, button")
      .forEach(function (el) {
        el.remove();
      });
    var firstLine = (clone3.innerText || clone3.textContent || "").split(
      "\n",
    )[0];
    candidates.push(firstLine);
  }

  // 5b. Recherche d'un label précédent dans le même container (SuccessFactors, Workday)
  //     Souvent le label est un <label> ou <span> frère, pas un parent
  var prevSibling = element.previousElementSibling;
  while (prevSibling) {
    var sibTag = prevSibling.tagName;
    if (sibTag === "LABEL" || sibTag === "SPAN" || sibTag === "DIV" || sibTag === "P") {
      var sibText = (prevSibling.innerText || prevSibling.textContent || "").trim();
      if (sibText.length > 1 && sibText.length < 100) {
        candidates.push(sibText);
        break;
      }
    }
    prevSibling = prevSibling.previousElementSibling;
  }

  // 5c. Arrière-arrière-grand-parent (formulaires très imbriqués type SF)
  var greatGrandParent = grandParent && grandParent.parentElement;
  if (greatGrandParent) {
    var clone4 = greatGrandParent.cloneNode(true);
    clone4.querySelectorAll("input, textarea, select, button").forEach(function (el) { el.remove(); });
    var ggpFirstLine = (clone4.innerText || clone4.textContent || "").split("\n")[0];
    if (ggpFirstLine.length < 100) candidates.push(ggpFirstLine);
  }

  // 5d. Chercher un label dans le container le plus proche (.form-group, fieldset, etc.)
  var fieldContainer = element.closest(
    "fieldset, .form-group, .field-group, .form-field, .field, " +
    '[class*="selectField"], [class*="formField"], [class*="input-group"], ' +
    '[class*="field-wrapper"], [class*="form-item"]'
  );
  if (fieldContainer) {
    var containerLabel = fieldContainer.querySelector("label, legend, .label, [class*='label']");
    if (containerLabel) {
      candidates.push(containerLabel.innerText || containerLabel.textContent || "");
    }
  }

  // 6. aria-labelledby — peut contenir plusieurs IDs séparés par des espaces
  var labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    labelledBy.trim().split(/\s+/).forEach(function (lbId) {
      var labelEl = document.getElementById(lbId);
      if (labelEl) candidates.push(labelEl.innerText || labelEl.textContent || "");
    });
  }

  // 7. aria-describedby — peut aussi contenir plusieurs IDs
  var describedBy = element.getAttribute("aria-describedby");
  if (describedBy) {
    describedBy.trim().split(/\s+/).forEach(function (dbId) {
      var descEl = document.getElementById(dbId);
      if (descEl) candidates.push(descEl.innerText || descEl.textContent || "");
    });
  }

  // ── Fast-path via autocomplete ─────────────────────────────────────────────
  var autocomp = (element.getAttribute("autocomplete") || "").toLowerCase();
  var AUTOCOMPLETE_MAP = {
    "given-name": "prenom", "family-name": "nom", "name": "nom_complet",
    "email": "email", "tel": "telephone", "phone": "telephone",
    "street-address": "adresse", "address-line1": "adresse",
    "postal-code": "code_postal", "country": "pays", "country-name": "pays",
    "address-level2": "ville", "address-level1": "region",
    "bday": "date_naissance", "organization": "employeur_actuel",
    "organization-title": "titre_poste", "url": "portfolio"
  };
  if (autocomp && AUTOCOMPLETE_MAP[autocomp]) return AUTOCOMPLETE_MAP[autocomp];

  // Normaliser tous les candidats et comparer
  var normalizedCandidates = candidates.map(normalize).filter(function (c) {
    return c.length > 0;
  });

  var fieldTypes = Object.keys(FIELD_MAPPINGS);

  // Passe 1 : correspondance EXACTE uniquement (priorité max)
  // Ex: "deuxieme prenom officiel" → exact match dans `nom`, pas substring dans `prenom`
  for (var i = 0; i < fieldTypes.length; i++) {
    var fieldType = fieldTypes[i];
    var keywords = FIELD_MAPPINGS[fieldType].map(normalize);
    for (var j = 0; j < normalizedCandidates.length; j++) {
      var candidate = normalizedCandidates[j];
      for (var k = 0; k < keywords.length; k++) {
        if (candidate === keywords[k]) {
          return fieldType;
        }
      }
    }
  }

  // Passe 2 : correspondance SUBSTRING
  for (var i2 = 0; i2 < fieldTypes.length; i2++) {
    var ft2 = fieldTypes[i2];
    var kws2 = FIELD_MAPPINGS[ft2].map(normalize);
    for (var j2 = 0; j2 < normalizedCandidates.length; j2++) {
      var cand2 = normalizedCandidates[j2];
      for (var k2 = 0; k2 < kws2.length; k2++) {
        if (cand2.includes(kws2[k2])) {
          return ft2;
        }
      }
    }
  }

  return null;
}

// ─── Traversée récursive du Shadow DOM ──────────────────────────────────────

/**
 * Retourne tous les éléments de formulaire, y compris dans le shadow DOM.
 * @param {Document|ShadowRoot|Element} root
 * @returns {HTMLElement[]}
 */
function querySelectorAllDeepInputs(root) {
  root = root || document;
  var selector = "input, textarea, select";
  var results = [];

  try {
    var found = root.querySelectorAll(selector);
    for (var i = 0; i < found.length; i++) results.push(found[i]);
  } catch (_) {}

  var allEls = root.querySelectorAll("*");
  for (var j = 0; j < allEls.length; j++) {
    if (allEls[j].shadowRoot) {
      var shadowInputs = querySelectorAllDeepInputs(allEls[j].shadowRoot);
      for (var k = 0; k < shadowInputs.length; k++) results.push(shadowInputs[k]);
    }
  }
  return results;
}

/**
 * Retourne les inputs de formulaire trouvés dans les iframes accessibles (same-origin).
 * @returns {HTMLElement[]}
 */
function getIframeInputs() {
  var results = [];
  try {
    var iframes = document.querySelectorAll("iframe");
    for (var i = 0; i < iframes.length; i++) {
      try {
        var doc = iframes[i].contentDocument || iframes[i].contentWindow.document;
        if (doc) {
          var inputs = querySelectorAllDeepInputs(doc);
          for (var j = 0; j < inputs.length; j++) results.push(inputs[j]);
        }
      } catch (_) {
        // Cross-origin iframe — inaccessible, on ignore
      }
    }
  } catch (_) {}
  return results;
}
