-- =====================================================
-- V2 : Création de la table refresh_tokens
-- =====================================================

CREATE TABLE refresh_tokens (
    id          UUID         NOT NULL,
    token       VARCHAR(512) NOT NULL,
    user_id     UUID         NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL,
    CONSTRAINT pk_refresh_tokens         PRIMARY KEY (id),
    CONSTRAINT uk_refresh_tokens_token   UNIQUE (token),
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Index pour la lookup par token et par utilisateur
CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens (token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
