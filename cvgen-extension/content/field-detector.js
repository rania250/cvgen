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
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // accents
    .replace(/[^a-z0-9\s]/g, ' ')      // ponctuation → espace
    .replace(/\s+/g, ' ')              // espaces multiples → un seul
    .trim();
}

// ─── Dictionnaire de mappings FR + EN ────────────────────────────────────────

var FIELD_MAPPINGS = {

  // ── IDENTITÉ ──────────────────────────────────────────────────────────────

  prenom: [
    'prénom', 'prenom', 'votre prénom', 'votre prenom', 'prénom *', 'prénom*',
    'prénom officiel', 'prenom officiel', 'prénom d usage', 'prenom d usage',
    'first name', 'firstname', 'given name', 'forename', 'first',
    'legal first name', 'preferred first name', 'first legal name'
  ],

  nom: [
    'nom', 'nom de famille', 'nom *', 'votre nom',
    'nom officiel', 'deuxième prénom officiel',
    'last name', 'lastname', 'surname', 'family name', 'last',
    'legal last name', 'legal name'
  ],

  nom_complet: [
    'nom complet', 'nom et prénom', 'prénom et nom',
    'full name', 'your name', 'name', 'nom et prenom', 'prenom et nom'
  ],

  email: [
    'email', 'e-mail', 'adresse email', 'adresse e-mail', 'adresse mail',
    'adresse electronique', 'adresse électronique', 'courriel',
    'adresse e mail correcte', 'adresse e-mail correcte',
    'votre email', 'votre adresse email',
    'email address', 'your email', 'mail', 'email address',
    'work email', 'contact email'
  ],

  telephone: [
    'téléphone', 'telephone', 'tel', 'tél',
    'numéro de téléphone', 'numero de telephone',
    'numéro de téléphone', 'numero de telephone',
    'téléphone mobile', 'telephone mobile',
    'mobile', 'portable', 'numéro de portable', 'numero de portable',
    'numéro de mobile', 'numéro de contact',
    'coordonnées téléphoniques',
    'phone', 'phone number', 'mobile number', 'cell phone', 'cell',
    'telephone number', 'contact number', 'work phone'
  ],

  adresse: [
    'adresse', 'adresse postale', 'adresse de résidence',
    'rue', 'numéro et rue', 'voie', 'adresse ligne 1', 'adresse 1',
    'address', 'street address', 'address line 1', 'street',
    'home address', 'mailing address', 'residential address'
  ],

  ville: [
    'ville', 'commune', 'localité', 'ville de résidence', 'votre ville',
    'city', 'town', 'municipality'
  ],

  code_postal: [
    'code postal', 'cp', 'code post', 'c p',
    'postal code', 'zip', 'zip code', 'postcode'
  ],

  pays: [
    'pays', 'pays de résidence', 'nationalité', 'pays actuel',
    'pays pour lequel vous postulez', 'pays de résidence',
    'country', 'country of residence', 'country of application',
    'home country', 'country code', 'code de pays'
  ],

  region: [
    'région', 'departement', 'département', 'province',
    'state', 'region', 'county'
  ],

  // ── PROFIL PROFESSIONNEL ───────────────────────────────────────────────────

  titre_poste: [
    'titre du poste', 'intitulé du poste', 'poste actuel',
    'poste souhaité', 'poste recherché', 'titre professionnel',
    'votre fonction', 'fonction actuelle', 'fonction', 'métier', 'profession',
    'job title', 'current title', 'position', 'title', 'role',
    'current position', 'current role'
  ],

  resume_professionnel: [
    'résumé', 'resume', 'présentation', 'présentation personnelle',
    'à propos de vous', 'a propos de vous', 'qui êtes-vous',
    'parlez-nous de vous', 'parlez nous de vous',
    'votre profil', 'profil', 'bio', 'biographie',
    'décrivez-vous', 'décrivez vous',
    'summary', 'about', 'about me', 'about you', 'profile',
    'professional summary'
  ],

  annees_experience: [
    'années d expérience', 'annees d experience',
    'nombre d années d expérience', 'expérience professionnelle',
    'niveau d expérience',
    'years of experience', 'experience level', 'seniority'
  ],

  niveau_etudes: [
    'niveau d études', 'niveau d etudes', 'niveau de formation',
    'diplôme', 'diplome', 'niveau scolaire', 'niveau d éducation',
    'education level', 'degree', 'highest education',
    'highest degree', 'qualification'
  ],

  // ── CANDIDATURE ────────────────────────────────────────────────────────────

  lettre_motivation: [
    'lettre de motivation', 'message de motivation', 'motivation',
    'votre message', 'message', 'message au recruteur',
    'pourquoi nous rejoindre', 'pourquoi postuler',
    'pourquoi ce poste vous intéresse', 'pourquoi êtes vous intéressé',
    'exprimez votre motivation', 'vos motivations',
    'décrivez votre candidature', 'présentez votre candidature',
    'commentaire', 'remarques', 'informations complémentaires',
    'informations supplémentaires', 'autres informations',
    'cover letter', 'motivation letter', 'why do you want to join',
    'why are you interested', 'why this role', 'tell us about yourself',
    'additional information', 'message to hiring manager'
  ],

  disponibilite: [
    'disponibilité', 'disponible à partir de', 'date de disponibilité',
    'date de début souhaitée', 'quand pouvez vous commencer',
    'prise de poste', 'date de prise de poste',
    'préavis', 'durée du préavis',
    'availability', 'available from', 'start date', 'notice period',
    'earliest start date', 'when can you start'
  ],

  salaire: [
    'prétention salariale', 'pretention salariale',
    'salaire souhaité', 'salaire désiré', 'salaire attendu',
    'rémunération souhaitée', 'remuneration souhaitee',
    'rémunération attendue', 'package souhaité',
    'salaire annuel brut souhaité',
    'expected salary', 'desired salary', 'salary expectation',
    'salary requirements', 'compensation', 'expected compensation'
  ],

  type_contrat: [
    'type de contrat', 'contrat recherché', 'type de poste',
    'cdi', 'cdd', 'alternance', 'stage', 'freelance',
    'contract type', 'employment type', 'job type'
  ],

  // ── LIENS & RÉSEAUX ────────────────────────────────────────────────────────

  linkedin: [
    'linkedin', 'profil linkedin', 'url linkedin',
    'lien linkedin', 'linkedin url', 'linkedin profile'
  ],

  portfolio: [
    'portfolio', 'site web', 'site personnel', 'site internet',
    'lien portfolio', 'url portfolio',
    'website', 'personal website', 'personal site'
  ],

  github: [
    'github', 'gitlab', 'bitbucket',
    'lien github', 'profil github', 'github url'
  ],

  // ── ÉGALITÉ & DIVERSITÉ ────────────────────────────────────────────────────

  genre: [
    'civilité', 'civilite', 'genre', 'sexe',
    'madame', 'monsieur', 'mme', 'm ',
    'gender', 'salutation', 'title'
  ],

  handicap: [
    'rqth', 'travailleur handicapé', 'reconnaissance handicap',
    'bénéficiaire de l obligation d emploi'
  ],

  // ── EXPÉRIENCE (sous-champs) ───────────────────────────────────────────────

  date_debut: [
    'date de début', 'date debut', 'début', 'date de commencement',
    'start date', 'from', 'date from', 'employment start'
  ],

  date_fin: [
    'date de fin', 'date fin', 'fin', 'jusqu a', 'jusqu au',
    'end date', 'to', 'date to', 'employment end'
  ],

  employeur_actuel: [
    'employeur actuel', 'poste actuel', 'emploi actuel', 'en poste',
    'current employer', 'current job', 'still employed', 'currently employed'
  ],

  // ── FORMATION (sous-champs) ────────────────────────────────────────────────

  date_diplome: [
    "date d obtention du diplome", "date d obtention", "annee d obtention",
    "graduation date", "date of graduation", "completion year", "year graduated"
  ],

  domaine_etude: [
    'domaine d etude', 'domaine', 'specialite', 'filiere', 'mention',
    'field of study', 'major', 'specialization', 'subject', 'discipline'
  ],

  ecole: [
    'ecole', 'universite', 'institut', 'etablissement',
    'ecole universite institut de formation', 'nom de l ecole',
    'school', 'university', 'institution', 'college', 'institute'
  ]
};

// ─── Filtres : champs à ignorer ───────────────────────────────────────────────

var IGNORED_TYPES = ['password', 'hidden', 'submit', 'button', 'reset', 'file', 'image', 'color', 'range'];
var IGNORED_NAME_PATTERNS = [/csrf/i, /token/i, /captcha/i, /honeypot/i, /_method/i, /recaptcha/i];

/**
 * Retourne true si l'élément doit être ignoré.
 */
function shouldIgnore(element) {
  if (IGNORED_TYPES.indexOf(element.type) !== -1) return true;
  if (!element.offsetParent && element.type !== 'hidden') {
    // Visible check : si offsetParent est null, l'élément est invisible
    // Exception : les selects avec display:none détectés autrement
  }
  if (getComputedStyle(element).display === 'none') return true;
  if (getComputedStyle(element).visibility === 'hidden') return true;

  var name = element.getAttribute('name') || '';
  if (IGNORED_NAME_PATTERNS.some(function (p) { return p.test(name); })) return true;

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
  candidates.push(element.getAttribute('name') || '');
  candidates.push(element.getAttribute('id') || '');
  candidates.push(element.getAttribute('placeholder') || '');
  candidates.push(element.getAttribute('autocomplete') || '');
  candidates.push(element.getAttribute('aria-label') || '');
  candidates.push(element.getAttribute('data-label') || '');
  candidates.push(element.getAttribute('data-field') || '');
  candidates.push(element.getAttribute('data-testid') || '');

  // 2. Label associé via for/id
  var id = element.getAttribute('id');
  if (id) {
    try {
      var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (label) candidates.push(label.innerText || label.textContent || '');
    } catch (_) {}
  }

  // 3. Label parent direct (<label><input>...</label>)
  var parentLabel = element.closest('label');
  if (parentLabel) {
    var clone1 = parentLabel.cloneNode(true);
    clone1.querySelectorAll('input, textarea, select').forEach(function (el) { el.remove(); });
    candidates.push(clone1.innerText || clone1.textContent || '');
  }

  // 4. Texte du parent immédiat (sans le texte de l'input)
  var parent = element.parentElement;
  if (parent) {
    var clone2 = parent.cloneNode(true);
    clone2.querySelectorAll('input, textarea, select').forEach(function (el) { el.remove(); });
    candidates.push((clone2.innerText || clone2.textContent || '').split('\n')[0]);
  }

  // 5. Texte du grand-parent — première ligne seulement (Indeed FR, WTTJ)
  var grandParent = element.parentElement && element.parentElement.parentElement;
  if (grandParent) {
    var clone3 = grandParent.cloneNode(true);
    clone3.querySelectorAll('input, textarea, select, button').forEach(function (el) { el.remove(); });
    var firstLine = (clone3.innerText || clone3.textContent || '').split('\n')[0];
    candidates.push(firstLine);
  }

  // 6. aria-labelledby (France Travail, Workday)
  var labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    var labelEl = document.getElementById(labelledBy);
    if (labelEl) candidates.push(labelEl.innerText || labelEl.textContent || '');
  }

  // 7. aria-describedby (parfois utilisé comme label secondaire)
  var describedBy = element.getAttribute('aria-describedby');
  if (describedBy) {
    var descEl = document.getElementById(describedBy);
    if (descEl) candidates.push(descEl.innerText || descEl.textContent || '');
  }

  // Normaliser tous les candidats et comparer
  var normalizedCandidates = candidates
    .map(normalize)
    .filter(function (c) { return c.length > 0; });

  var fieldTypes = Object.keys(FIELD_MAPPINGS);
  for (var i = 0; i < fieldTypes.length; i++) {
    var fieldType = fieldTypes[i];
    var keywords = FIELD_MAPPINGS[fieldType].map(normalize);

    for (var j = 0; j < normalizedCandidates.length; j++) {
      var candidate = normalizedCandidates[j];
      for (var k = 0; k < keywords.length; k++) {
        var keyword = keywords[k];
        if (candidate === keyword || candidate.includes(keyword)) {
          return fieldType;
        }
      }
    }
  }

  return null;
}
