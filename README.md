# CVGen

**CVGen** est un SaaS francophone de génération de CV intelligents propulsé par l'IA. Plateforme fullstack permettant de créer, optimiser et adapter des CV à chaque offre d'emploi en quelques minutes — et de remplir automatiquement les formulaires de candidature en ligne via une extension Chrome.

## Composants du projet

| Composant | Description |
| --------- | ----------- |
| `cvgen-backend` | API REST Spring Boot — gestion des profils, auth JWT, génération de CV, scoring ATS |
| `cvgen-frontend` | Application web React — interface utilisateur pour créer et gérer son profil/CV |
| `cvgen-extension` | Extension Chrome MV3 — autofill des formulaires de candidature à partir du profil CVGen |

## Stack technique

- **Backend** : Java 17, Spring Boot 3.2, PostgreSQL 16, Flyway, JJWT, MapStruct, springdoc-openapi
- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS, React Router, Zustand, React Hook Form + Zod
- **Extension** : Chrome MV3, Vanilla JS (ES2020), Content Scripts, Service Worker
- **Infra** : Docker Compose (dev), Railway (backend), Vercel (frontend), Supabase (storage)
- **Architecture** : monolithe modulaire (`auth`, `profile`, `generation`, `ats`, `application`, `shared`) + hexagonale sur `generation` et `ats`

## Prérequis

- **Java 17** (Temurin recommandé)
- **Node.js 20+** et npm
- **Docker** + Docker Compose
- **Maven 3.9+** (ou utiliser le wrapper si présent)
- **Google Chrome** (pour l'extension)

## Démarrage rapide

### 1. Cloner et configurer l'environnement

```bash
git clone https://github.com/Abdouni946/Cvgen.git
cd Cvgen
cp .env.example .env
# Éditer .env si nécessaire (JWT_SECRET en production !)
```

### 2. Lancer Postgres + Backend via Docker Compose

```bash
docker compose up -d
```

Cela démarre :
- `cvgen-postgres` sur `localhost:5432`
- `cvgen-backend` sur `localhost:8080` (build automatique du JAR)

### 3. Lancer le frontend en dev

```bash
cd cvgen-frontend
npm install
npm run dev
```

### 4. Installer l'extension Chrome (mode développeur)

1. Ouvrir `chrome://extensions`
2. Activer le **mode développeur** (bouton en haut à droite)
3. Cliquer **"Charger l'extension non empaquetée"**
4. Sélectionner le dossier `cvgen-extension/`
5. L'extension apparaît dans la barre d'outils Chrome

## URLs utiles

| Service              | URL                                         |
| -------------------- | ------------------------------------------- |
| API Backend          | http://localhost:8080                       |
| Swagger UI           | http://localhost:8080/swagger-ui.html       |
| OpenAPI JSON         | http://localhost:8080/v3/api-docs           |
| Health Actuator      | http://localhost:8080/actuator/health       |
| Frontend (Vite)      | http://localhost:5173                       |
| PostgreSQL           | `postgres://cvgen_user:cvgen_password@localhost:5432/cvgen` |

## Structure du projet

```
cvgen/
├── cvgen-backend/                  # Spring Boot (monolithe modulaire)
│   ├── src/main/java/com/cvgen/backend/
│   │   ├── auth/                   # Authentification (register, login, JWT)
│   │   │   ├── api/                # Controllers + DTOs
│   │   │   ├── application/        # Services / cas d'usage
│   │   │   └── infrastructure/     # JPA, Spring Security
│   │   ├── profile/                # Profils utilisateurs + endpoint /complet
│   │   ├── generation/             # Génération IA de CV (hexagonal)
│   │   ├── ats/                    # Scoring ATS (hexagonal)
│   │   ├── application/            # Suivi de candidatures
│   │   └── shared/
│   │       ├── config/             # SecurityConfig, JpaConfig, OpenApiConfig
│   │       ├── exception/          # GlobalExceptionHandler + custom exceptions
│   │       └── response/           # ApiResponse<T> standardisé
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/           # Migrations Flyway (V1__, V2__...)
│   ├── Dockerfile                  # Multi-stage Maven → JRE Alpine
│   └── pom.xml
│
├── cvgen-frontend/                 # React + Vite + TS
│   └── src/
│       ├── api/                    # axiosInstance + endpoints
│       ├── components/
│       │   ├── ui/                 # Button, Input, Logo...
│       │   └── layout/             # Navbar, Footer, AuthLayout
│       ├── hooks/
│       ├── pages/
│       │   ├── auth/               # LoginPage, RegisterPage
│       │   ├── dashboard/          # Tableau de bord
│       │   └── HomePage.tsx
│       ├── router/                 # Configuration React Router + RequireAuth
│       ├── store/                  # Zustand (authStore)
│       └── types/                  # Types alignés sur les DTOs backend
│
├── cvgen-extension/                # Extension Chrome MV3 (Vanilla JS)
│   ├── manifest.json               # Déclaration MV3 — permissions, content scripts
│   ├── service-worker.js           # Point d'entrée du background service worker
│   ├── background/
│   │   └── service-worker.js       # Logique SW : appels API, cache profil, auth
│   ├── content/
│   │   ├── content-script.js       # Orchestrateur : écoute messages popup, lance le fill
│   │   ├── field-detector.js       # Détection du type de champ (aria, labels, name…)
│   │   ├── field-mapper.js         # Mapping type de champ → valeur du profil
│   │   ├── field-filler.js         # Remplissage natif (input, select, custom SF dropdowns)
│   │   ├── dynamic-sections.js     # Ajout de sections dynamiques (expériences, formations)
│   │   ├── date-handler.js         # Gestion des champs date (formats multiples)
│   │   ├── offer-extractor.js      # Extraction de l'offre d'emploi depuis la page
│   │   └── file-uploader.js        # Upload de CV (PDF/DOCX)
│   ├── popup/
│   │   ├── popup.html              # Interface popup
│   │   ├── popup.js                # Logique popup (connexion, sync profil, fill)
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html            # Page de paramètres (URL API configurable)
│   │   └── options.js
│   ├── utils/
│   │   ├── api-client.js           # apiFetch() avec Bearer token
│   │   ├── storage.js              # Abstraction chrome.storage.local
│   │   └── logger.js               # Logger avec préfixe [CVGen]
│   └── assets/icons/               # Icônes 16/32/48/128px
│
├── .github/workflows/ci.yml        # CI : backend (Maven + Postgres) + frontend (Vite)
├── docker-compose.yml              # Postgres + Backend
├── .env.example                    # Variables d'environnement (template)
└── README.md
```

## Extension Chrome — Fonctionnement

L'extension se connecte à votre compte CVGen pour récupérer votre profil, puis remplit automatiquement les formulaires de candidature sur les principaux ATS.

### Sites supportés

| ATS / Jobboard | Support |
| -------------- | ------- |
| SAP SuccessFactors | ✅ Complet (dropdowns custom inclus) |
| LinkedIn | ✅ |
| Indeed | ✅ |
| Welcome to the Jungle | ✅ |
| France Travail | ✅ |
| Greenhouse | ✅ |
| Lever | ✅ |
| Workday / MyWorkdayJobs | ✅ |
| SmartRecruiters | ✅ |
| iCIMS | ✅ |
| Taleo | ✅ |
| Jobvite | ✅ |

### Utilisation

1. Se connecter via le **popup** de l'extension (email + mot de passe CVGen)
2. Cliquer **"Synchroniser le profil"** pour charger les données depuis l'API
3. Naviguer vers un formulaire de candidature
4. Cliquer **"Remplir le formulaire"** — l'extension détecte et remplit tous les champs disponibles

### Données remplies automatiquement

- Identité (prénom, nom, email, téléphone, adresse, nationalité…)
- Expériences professionnelles (poste, entreprise, dates, description)
- Formations (diplôme, établissement, niveau, dates)
- Compétences et langues
- Liens (LinkedIn, GitHub, portfolio)
- Lettre de motivation (si générée)

## Conventions

- **Entités JPA** : UUID en PK, jamais exposées directement dans les controllers (toujours via DTOs)
- **Réponses API** : enveloppées dans `ApiResponse<T>`
- **Migrations** : Flyway, numérotées `V1__`, `V2__`...
- **Code** : anglais — **commentaires** : français
- **Secrets** : exclusivement via variables d'environnement

## Endpoints API

### Authentification

| Méthode | Endpoint              | Description                              |
| ------- | --------------------- | ---------------------------------------- |
| POST    | `/api/auth/register`  | Création de compte                       |
| POST    | `/api/auth/login`     | Connexion (retourne access + refresh)    |
| POST    | `/api/auth/refresh`   | Renouvellement de l'access token         |

### Profil

| Méthode | Endpoint                  | Description                                          |
| ------- | ------------------------- | ---------------------------------------------------- |
| GET     | `/api/profile`            | Profil complet (format backend — champs anglais)     |
| PUT     | `/api/profile`            | Mise à jour du profil                                |
| GET     | `/api/profile/complet`    | Profil agrégé au format extension (champs français)  |

Tous les endpoints (sauf auth) requièrent l'en-tête `Authorization: Bearer <accessToken>`.

## Tests

```bash
# Backend
cd cvgen-backend && mvn verify

# Frontend
cd cvgen-frontend && npm run lint && npm run type-check && npm run build
```

## CI

Workflow GitHub Actions `CVGen CI` (`.github/workflows/ci.yml`) :
- **`backend-ci`** : démarre Postgres en service container, lance `mvn verify`, upload du JAR
- **`frontend-ci`** : `npm ci` → `lint` → `type-check` → `build`, upload du `dist/`

Les deux jobs tournent en parallèle sur `push`/`pull_request` vers `main` et `develop`.

## Licence

Privé — tous droits réservés.
