-- =====================================================
-- V4 : Table des CV générés (generated_cvs)
--      Stocke les CV optimisés générés par Gemini
-- =====================================================

CREATE TABLE generated_cvs (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    job_offer_text  TEXT         NOT NULL,
    title           VARCHAR(255),
    summary         TEXT,
    experiences     JSONB,
    educations      JSONB,
    skills          JSONB,
    languages       JSONB,
    certifications  JSONB,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_generated_cvs          PRIMARY KEY (id),
    CONSTRAINT fk_generated_cv_user      FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_generated_cvs_user_id ON generated_cvs (user_id);
CREATE INDEX idx_generated_cvs_created_at ON generated_cvs (created_at DESC);

