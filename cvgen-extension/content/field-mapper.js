/**
 * CVGen Field Mapper
 * Fait correspondre un type de champ détecté à la valeur du profil à injecter.
 */

// Mapping minimal pays → indicatif téléphonique international (format +XX)
// La liste couvre les pays francophones + principaux marchés visés.
var DIALING_CODES = {
  france: "+33", belgique: "+32", belgium: "+32",
  suisse: "+41", switzerland: "+41",
  luxembourg: "+352",
  canada: "+1", "canada (quebec)": "+1",
  "united states": "+1", "etats unis": "+1", "états-unis": "+1", usa: "+1",
  "royaume uni": "+44", "royaume-uni": "+44", "united kingdom": "+44", uk: "+44",
  allemagne: "+49", germany: "+49",
  espagne: "+34", spain: "+34",
  italie: "+39", italy: "+39",
  portugal: "+351",
  "pays bas": "+31", "pays-bas": "+31", netherlands: "+31",
  irlande: "+353", ireland: "+353",
  maroc: "+212", morocco: "+212",
  tunisie: "+216", tunisia: "+216",
  algerie: "+213", "algérie": "+213", algeria: "+213",
};

/**
 * Retourne l'indicatif téléphonique (+XX) à partir du profil.
 * Exposé sur window pour les cas où le champ est un input texte pur
 * attendant explicitement un indicatif numérique (peu fréquent).
 *
 * @returns {string} Ex: "+33", "+212"
 */
function getDialingCode(identite) {
  if (!identite) return "+33";

  // 1. Champ explicite si présent (futur)
  if (identite.indicatifTelephone) return String(identite.indicatifTelephone);

  // 2. Extraction depuis le numéro stocké ("+33 6 12 …" ou "00 33 …")
  var tel = (identite.telephone || "").replace(/\s+/g, "");
  var m = tel.match(/^\+(\d{1,4})/) || tel.match(/^00(\d{1,4})/);
  if (m) return "+" + m[1];

  // 3. Déduction depuis le pays
  var pays = (identite.pays || "France").toString().toLowerCase().trim();
  return DIALING_CODES[pays] || "+33";
}

/**
 * Retourne la valeur du profil CVGen pour un type de champ donné.
 *
 * @param {string} fieldType   - Type retourné par detectFieldType()
 * @param {Object} profil      - Objet profil complet (GET /api/profil/complet)
 * @param {string|null} coverLetter - Lettre de motivation pré-générée (ou null)
 * @returns {string|null}      - Valeur à injecter, ou null si inconnue/vide
 */
function getValueForField(fieldType, profil, coverLetter) {
  if (!profil) return null;

  var identite = profil.identite || {};
  var formations = profil.formations || [];
  var niveauEtudes =
    formations.length > 0 ? formations[0].niveauEtudes || "" : "";

  var map = {
    prenom: identite.prenom || "",
    nom: identite.nom || "",
    nom_complet:
      identite.nomComplet ||
      (identite.prenom && identite.nom
        ? identite.prenom + " " + identite.nom
        : ""),
    email: identite.email || "",
    telephone: identite.telephone || "",
    adresse: identite.adresse || "",
    ville: identite.ville || "",
    code_postal: identite.codePostal || "",
    region: identite.region || "",
    pays: identite.pays || "France",
    linkedin: identite.linkedin || "",
    portfolio: identite.portfolio || "",
    github: identite.github || "",
    titre_poste: profil.titrePoste || "",
    resume_professionnel: profil.resumeProfessionnel || "",
    annees_experience: profil.anneesExperience || "",
    niveau_etudes: niveauEtudes,
    disponibilite: profil.disponibilite || "",
    salaire: profil.pretentionSalariale || "",
    type_contrat: profil.typeContrat || "",
    genre: identite.genre || "",
    handicap: profil.handicap ? "Oui" : "Non",

    // ── Sous-champs expérience ────────────────────────────────────────────
    date_debut:
      profil.experiences && profil.experiences[0]
        ? profil.experiences[0].dateDebut || ""
        : "",
    date_fin:
      profil.experiences && profil.experiences[0]
        ? profil.experiences[0].dateFin || ""
        : "",
    employeur_actuel:
      profil.experiences &&
      profil.experiences[0] &&
      !profil.experiences[0].dateFin
        ? "Oui"
        : "Non",

    // ── Sous-champs formation ─────────────────────────────────────────────
    nom_formation:
      profil.formations && profil.formations[0]
        ? profil.formations[0].diplome || profil.formations[0].niveauEtudes || ""
        : "",
    date_diplome:
      profil.formations && profil.formations[0]
        ? profil.formations[0].annee || profil.formations[0].dateFin || ""
        : "",
    domaine_etude:
      profil.formations && profil.formations[0]
        ? profil.formations[0].mention || profil.formations[0].domaine || ""
        : "",
    ecole:
      profil.formations && profil.formations[0]
        ? profil.formations[0].etablissement || ""
        : "",
    diplome_plus_eleve:
      profil.formations && profil.formations[0]
        ? profil.formations[0].niveauEtudes || profil.formations[0].diplome || ""
        : "",

    /**
     * Lettre de motivation :
     * - Si une lettre pré-générée est disponible dans le cache → l'injecter
     * - Sinon → null (le popup affiche un message d'invitation)
     */
    lettre_motivation: coverLetter || "",

    // ── Champs supplémentaires ──────────────────────────────────────────────
    date_naissance: identite.dateNaissance || "",
    nationalite: identite.nationalite || identite.pays || "",
    competences:
      profil.competences && Array.isArray(profil.competences)
        ? profil.competences.join(", ")
        : profil.competences || "",
    langues:
      profil.langues && Array.isArray(profil.langues)
        ? profil.langues.map(function (l) { return typeof l === "string" ? l : (l.nom || l.langue || ""); }).filter(Boolean).join(", ")
        : profil.langues || "",
    permis: profil.permis || identite.permis || "",
    autorisation_travail: profil.autorisationTravail ? "Oui" : "Non",
    source_candidature: "",
    // Indicatif téléphonique : on renvoie le NOM DU PAYS.
    // fillSelectField gère les alias (France ↔ "France (+33)" ↔ "FR" ↔ "+33").
    // Pour un input texte pur, getDialingCode() est exposé sur window.
    indicatif_telephone: identite.pays || "France",
  };

  var value = map[fieldType];

  // Retourne null si la valeur est vide (ne pas écraser les champs vides)
  if (value === undefined || value === null || value === "") return null;

  return String(value);
}
