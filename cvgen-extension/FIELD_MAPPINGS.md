# FIELD_MAPPINGS — Documentation des mappings de champs

Ce document liste tous les types de champs reconnus par CVGen et les mots-clés associés (français + anglais).

L'algorithme de détection normalise les chaînes avant comparaison :
- Passage en minuscules
- Suppression des accents (é→e, à→a, ê→e…)
- Remplacement de la ponctuation par des espaces
- Collapsage des espaces multiples

Sources inspectées pour chaque champ : `name`, `id`, `placeholder`, `autocomplete`, `aria-label`, `data-label`, `data-field`, labels associés via `for/id`, texte des parents, `aria-labelledby`.

---

## Identité

### `prenom`
Valeur injectée : `profil.identite.prenom`

| Mot-clé FR | Mot-clé EN |
|---|---|
| prénom, prenom | first name, firstname |
| votre prénom | given name, forename, first |
| prénom \*, prénom\* | — |

---

### `nom`
Valeur injectée : `profil.identite.nom`

| Mot-clé FR | Mot-clé EN |
|---|---|
| nom, nom de famille | last name, lastname |
| nom \*, votre nom | surname, family name, last |

---

### `nom_complet`
Valeur injectée : `profil.identite.nomComplet` ou `prenom + " " + nom`

| Mot-clé FR | Mot-clé EN |
|---|---|
| nom complet | full name |
| nom et prénom | your name, name |
| prénom et nom | — |

---

### `email`
Valeur injectée : `profil.identite.email`

| Mot-clé FR | Mot-clé EN |
|---|---|
| email, e-mail, courriel | email address, your email |
| adresse email, adresse mail | mail |
| adresse électronique | — |

---

### `telephone`
Valeur injectée : `profil.identite.telephone`

| Mot-clé FR | Mot-clé EN |
|---|---|
| téléphone, tel, tél | phone, phone number |
| numéro de téléphone | mobile number, cell phone |
| mobile, portable | cell |
| numéro de contact | — |

---

### `adresse`
Valeur injectée : `profil.identite.adresse`

| Mot-clé FR | Mot-clé EN |
|---|---|
| adresse, adresse postale | address, street address |
| rue, numéro et rue | address line 1, street |
| adresse ligne 1, adresse 1 | — |

---

### `ville`
Valeur injectée : `profil.identite.ville`

| Mot-clé FR | Mot-clé EN |
|---|---|
| ville, commune, localité | city, town |
| ville de résidence, votre ville | — |

---

### `code_postal`
Valeur injectée : `profil.identite.codePostal`

| Mot-clé FR | Mot-clé EN |
|---|---|
| code postal, cp | postal code, zip |
| code post, c p | zip code, postcode |

---

### `pays`
Valeur injectée : `profil.identite.pays` (défaut : `"France"`)

| Mot-clé FR | Mot-clé EN |
|---|---|
| pays, pays de résidence | country, country of residence |
| nationalité, pays actuel | — |

---

### `region`
Valeur injectée : `profil.identite.region`

| Mot-clé FR | Mot-clé EN |
|---|---|
| région, département | state, region |
| departement, province | province |

---

## Profil professionnel

### `titre_poste`
Valeur injectée : `profil.titrePoste`

| Mot-clé FR | Mot-clé EN |
|---|---|
| titre du poste, intitulé du poste | job title, current title |
| poste actuel, poste souhaité | position, title, role |
| fonction, métier, profession | current position, current role |

---

### `resume_professionnel`
Valeur injectée : `profil.resumeProfessionnel`

| Mot-clé FR | Mot-clé EN |
|---|---|
| résumé, présentation | summary, about, about me |
| à propos de vous, votre profil | profile, professional summary |
| bio, biographie | tell us about yourself |
| décrivez-vous | — |

---

### `annees_experience`
Valeur injectée : `profil.anneesExperience`

| Mot-clé FR | Mot-clé EN |
|---|---|
| années d'expérience | years of experience |
| expérience professionnelle | experience level, seniority |

---

### `niveau_etudes`
Valeur injectée : `profil.formations[0].niveauEtudes`

| Mot-clé FR | Mot-clé EN |
|---|---|
| niveau d'études, diplôme | education level, degree |
| niveau de formation | highest education, qualification |
| niveau scolaire | highest degree |

---

## Candidature

### `lettre_motivation`
Valeur injectée : lettre pré-générée depuis le cache, sinon vide.
> Si aucune lettre n'est disponible, le popup affiche : *"Générez d'abord votre lettre de motivation sur CVGen"*

| Mot-clé FR | Mot-clé EN |
|---|---|
| lettre de motivation | cover letter, motivation letter |
| message de motivation | why do you want to join |
| pourquoi postuler | why are you interested, why this role |
| informations complémentaires | additional information |
| commentaire, remarques | message to hiring manager |

---

### `disponibilite`
Valeur injectée : `profil.disponibilite`

| Mot-clé FR | Mot-clé EN |
|---|---|
| disponibilité, date de disponibilité | availability, start date |
| quand pouvez-vous commencer | when can you start |
| préavis, durée du préavis | notice period, earliest start date |

---

### `salaire`
Valeur injectée : `profil.pretentionSalariale`

| Mot-clé FR | Mot-clé EN |
|---|---|
| prétention salariale | expected salary, desired salary |
| salaire souhaité, salaire attendu | salary expectation, compensation |
| rémunération souhaitée | salary requirements |

---

### `type_contrat`
Valeur injectée : `profil.typeContrat`

| Mot-clé FR | Mot-clé EN |
|---|---|
| type de contrat, contrat recherché | contract type, employment type |
| cdi, cdd, alternance, stage | job type |

---

## Liens & Réseaux

### `linkedin`
Valeur injectée : `profil.identite.linkedin`

| Mot-clé FR | Mot-clé EN |
|---|---|
| linkedin, profil linkedin | linkedin url, linkedin profile |
| lien linkedin, url linkedin | — |

---

### `portfolio`
Valeur injectée : `profil.identite.portfolio`

| Mot-clé FR | Mot-clé EN |
|---|---|
| portfolio, site web, site personnel | website, personal website |
| lien portfolio, url portfolio | personal site |

---

### `github`
Valeur injectée : `profil.identite.github`

| Mot-clé FR | Mot-clé EN |
|---|---|
| github, gitlab, bitbucket | github url |
| lien github, profil github | — |

---

## Égalité & Diversité

### `genre`
Valeur injectée : `profil.identite.genre`

Correspondances `<select>` gérées automatiquement :
- `"Homme"` → `"M."`, `"Monsieur"`, `"Mr"`, `"H"`
- `"Femme"` → `"Mme"`, `"Madame"`, `"F"`

| Mot-clé FR | Mot-clé EN |
|---|---|
| civilité, genre, sexe | gender, salutation, title |
| madame, monsieur, mme | — |

---

### `handicap`
Valeur injectée : `"Oui"` si `profil.handicap === true`, sinon `"Non"`

| Mot-clé FR |
|---|
| rqth, travailleur handicapé |
| reconnaissance handicap |
| bénéficiaire de l'obligation d'emploi |

---

## Correspondances `<select>` automatiques

L'algorithme `fillSelectField()` tente plusieurs niveaux de correspondance pour les listes déroulantes :

1. **Correspondance exacte normalisée** (ex: `"france"` = `"France"`)
2. **Correspondance partielle** (l'une contient l'autre)
3. **Alias spécifiques** :

| Valeur profil | Options reconnues |
|---|---|
| Homme | M., Monsieur, M, Mr, H |
| Femme | Mme, Madame, F |
| CDI | Contrat à durée indéterminée, Permanent |
| CDD | Contrat à durée déterminée, Temporary, Fixed term |
| Stage | Internship, Intern |
| Alternance | Apprentissage, Apprenticeship |
| Freelance | Indépendant, Contractor |
| France | FR |
| Bac+5 | Master, Bac + 5, Master 2, Niveau I |
| Bac+3 | Licence, Bachelor, Bac + 3, Niveau II |
| Bac+2 | BTS, DUT, Bac + 2, Niveau III |
| Bac | Baccalauréat, Niveau IV |
