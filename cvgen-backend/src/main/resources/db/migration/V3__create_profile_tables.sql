-- =====================================================
-- V3 : Tables du module profile (CV)
--      user_profiles, experiences, educations,
--      skills, languages, certifications
-- =====================================================

-- -----------------------------------------------------
-- 1. user_profiles : profil enrichi (1-1 avec users)
-- -----------------------------------------------------
CREATE TABLE user_profiles (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    title           VARCHAR(255),
    summary         TEXT,
    phone           VARCHAR(50),
    location        VARCHAR(255),
    photo_url       VARCHAR(500),
    linkedin_url    VARCHAR(500),
    github_url      VARCHAR(500),
    portfolio_url   VARCHAR(500),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_user_profiles          PRIMARY KEY (id),
    CONSTRAINT uk_user_profiles_user_id  UNIQUE (user_id),
    CONSTRAINT fk_user_profile_user      FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);


-- -----------------------------------------------------
-- 2. experiences : expériences professionnelles
-- -----------------------------------------------------
CREATE TABLE experiences (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    job_title       VARCHAR(255) NOT NULL,
    company         VARCHAR(255) NOT NULL,
    location        VARCHAR(255),
    start_date      DATE         NOT NULL,
    end_date        DATE,
    current         BOOLEAN      NOT NULL DEFAULT FALSE,
    description     TEXT,
    display_order   INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_experiences        PRIMARY KEY (id),
    CONSTRAINT fk_experience_user    FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_experience_dates   CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_experiences_user_id ON experiences (user_id);


-- -----------------------------------------------------
-- 3. educations : formations / diplômes
-- -----------------------------------------------------
CREATE TABLE educations (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    degree          VARCHAR(255),
    school          VARCHAR(255) NOT NULL,
    field_of_study  VARCHAR(255),
    start_date      DATE,
    end_date        DATE,
    description     TEXT,
    display_order   INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_educations        PRIMARY KEY (id),
    CONSTRAINT fk_education_user    FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_education_dates   CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_educations_user_id ON educations (user_id);


-- -----------------------------------------------------
-- 4. skills : compétences techniques
-- -----------------------------------------------------
CREATE TABLE skills (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    name            VARCHAR(100) NOT NULL,
    skill_level     VARCHAR(50),
    category        VARCHAR(100),
    display_order   INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_skills          PRIMARY KEY (id),
    CONSTRAINT fk_skill_user      FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_skills_level    CHECK (skill_level IS NULL
        OR skill_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'))
);

CREATE INDEX idx_skills_user_id ON skills (user_id);


-- -----------------------------------------------------
-- 5. languages : langues parlées (CECRL)
-- -----------------------------------------------------
CREATE TABLE languages (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    name            VARCHAR(100) NOT NULL,
    language_level  VARCHAR(10),
    display_order   INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT pk_languages        PRIMARY KEY (id),
    CONSTRAINT fk_language_user    FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_languages_level  CHECK (language_level IS NULL
        OR language_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE'))
);

CREATE INDEX idx_languages_user_id ON languages (user_id);


-- -----------------------------------------------------
-- 6. certifications : certifications professionnelles
-- -----------------------------------------------------
CREATE TABLE certifications (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    name            VARCHAR(255) NOT NULL,
    issuer          VARCHAR(255),
    issue_date      DATE,
    expiry_date     DATE,
    credential_url  VARCHAR(500),
    display_order   INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_certifications        PRIMARY KEY (id),
    CONSTRAINT fk_certification_user    FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_certification_dates   CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

CREATE INDEX idx_certifications_user_id ON certifications (user_id);
