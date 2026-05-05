-- =====================================================
-- V1 : Création de la table users
-- =====================================================

CREATE TABLE users (
    id          UUID         NOT NULL,
    email       VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    first_name  VARCHAR(100),
    last_name   VARCHAR(100),
    role        VARCHAR(32)  NOT NULL DEFAULT 'ROLE_USER',
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP    NOT NULL,
    CONSTRAINT pk_users         PRIMARY KEY (id),
    CONSTRAINT uk_users_email   UNIQUE (email),
    CONSTRAINT ck_users_role    CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN'))
);

-- Index sur email pour les recherches/login
CREATE INDEX idx_users_email ON users (email);
