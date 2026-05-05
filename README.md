# CVGen

**CVGen** est un SaaS francophone de génération de CV intelligents propulsé par l'IA. Plateforme fullstack permettant de créer, optimiser et adapter des CV à chaque offre d'emploi en quelques minutes.

## Stack technique

- **Backend** : Java 17, Spring Boot 3.2, PostgreSQL 16, Flyway, JJWT, MapStruct, springdoc-openapi
- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS, React Router, React Query, Zustand, React Hook Form + Zod
- **Infra** : Docker Compose (dev), Railway (backend), Vercel (frontend), Supabase (storage)
- **Architecture** : monolithe modulaire (`auth`, `profile`, `generation`, `ats`, `application`, `shared`) + hexagonale sur `generation` et `ats`

## Prérequis

- **Java 17** (Temurin recommandé)
- **Node.js 20+** et npm
- **Docker** + Docker Compose
- **Maven 3.9+** (ou utiliser le wrapper si présent)

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
docker-compose up -d
```

Cela démarre :
- `cvgen-postgres` sur `localhost:5432`
- `cvgen-backend` sur `localhost:8080` (build automatique du JAR)

### 3. Lancer le frontend en dev

```bash
cd cvgen-frontend
cp .env.example .env
npm install
npm run dev
```

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
│   │   ├── profile/                # Profils utilisateurs (à venir)
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
│       │   └── layout/
│       ├── hooks/
│       ├── pages/
│       │   ├── auth/               # LoginPage, RegisterPage
│       │   └── dashboard/
│       ├── router/                 # Configuration React Router
│       ├── store/                  # Zustand (authStore)
│       └── types/                  # Types alignés sur les DTOs backend
│
├── .github/workflows/ci.yml        # CI : backend (Maven + Postgres) + frontend (Vite)
├── docker-compose.yml              # Postgres + Backend
├── .env.example                    # Variables d'environnement (template)
└── README.md
```

## Conventions

- **Entités JPA** : UUID en PK, jamais exposées directement dans les controllers (toujours via DTOs)
- **Réponses API** : enveloppées dans `ApiResponse<T>`
- **Migrations** : Flyway, numérotées `V1__`, `V2__`...
- **Code** : anglais — **commentaires** : français
- **Secrets** : exclusivement via variables d'environnement

## Endpoints d'authentification

| Méthode | Endpoint              | Description                              |
| ------- | --------------------- | ---------------------------------------- |
| POST    | `/api/auth/register`  | Création de compte                       |
| POST    | `/api/auth/login`     | Connexion (retourne access + refresh)    |
| POST    | `/api/auth/refresh`   | Renouvellement de l'access token         |

Tous les autres endpoints requièrent l'en-tête `Authorization: Bearer <accessToken>`.

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
