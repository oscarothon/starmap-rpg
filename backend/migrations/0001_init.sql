-- Schema central do mapa estelar.
-- Módulos futuros (boletins, procurados, conflitos, corsários) entram como
-- migrations novas com tabelas próprias referenciando estas por FK — nunca
-- alterando as tabelas centrais.

-- Regiões hierárquicas: supercluster > cluster > subcluster > ...
CREATE TABLE region (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id   INTEGER REFERENCES region(id) ON DELETE SET NULL,
    name        TEXT    NOT NULL,
    level       TEXT    NOT NULL DEFAULT 'cluster',
    description TEXT    NOT NULL DEFAULT '',
    color_hex   TEXT    NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_region_parent ON region(parent_id);

-- Facções / nações / blocos políticos.
CREATE TABLE faction (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    short_name  TEXT    NOT NULL DEFAULT '',
    color_hex   TEXT    NOT NULL DEFAULT '#8899aa',
    flag_icon   TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Sistemas estelares: os nós do mapa.
CREATE TABLE star_system (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    name                 TEXT    NOT NULL,
    region_id            INTEGER REFERENCES region(id) ON DELETE SET NULL,
    x                    REAL    NOT NULL DEFAULT 0,
    y                    REAL    NOT NULL DEFAULT 0,
    star_type            TEXT    NOT NULL DEFAULT '',
    star_count           INTEGER NOT NULL DEFAULT 1,
    lore_text            TEXT    NOT NULL DEFAULT '',
    notice_text          TEXT    NOT NULL DEFAULT '',
    sovereign_faction_id INTEGER REFERENCES faction(id) ON DELETE SET NULL,
    population           INTEGER NOT NULL DEFAULT 0,
    is_classified        INTEGER NOT NULL DEFAULT 0,
    -- Métricas do Índice de Sistemas (0-100). NULL = sem dados ("-" na tabela).
    economy              INTEGER,
    industry             INTEGER,
    innovation           INTEGER,
    information          INTEGER,
    stability            INTEGER,
    quality_of_life      INTEGER,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    CHECK (star_count >= 1),
    CHECK (is_classified IN (0, 1))
);

CREATE INDEX idx_star_system_region    ON star_system(region_id);
CREATE INDEX idx_star_system_sovereign ON star_system(sovereign_faction_id);
CREATE INDEX idx_star_system_name      ON star_system(name);

-- Corpos celestes: planetas, luas (parent_body_id), estações, cinturões.
CREATE TABLE celestial_body (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id        INTEGER NOT NULL REFERENCES star_system(id) ON DELETE CASCADE,
    parent_body_id   INTEGER REFERENCES celestial_body(id) ON DELETE CASCADE,
    name             TEXT    NOT NULL,
    body_type        TEXT    NOT NULL DEFAULT 'planet',
    orbital_order    INTEGER NOT NULL DEFAULT 0,
    orbital_radius_au REAL,
    is_colonized     INTEGER NOT NULL DEFAULT 0,
    description      TEXT    NOT NULL DEFAULT '',
    colony_notes     TEXT    NOT NULL DEFAULT '',
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    CHECK (is_colonized IN (0, 1))
);

CREATE INDEX idx_celestial_body_system ON celestial_body(system_id);
CREATE INDEX idx_celestial_body_parent ON celestial_body(parent_body_id);

-- Tags descritivas de um corpo ("Sem Atmosfera", "Mundo Oceânico", ...).
CREATE TABLE celestial_body_tag (
    body_id INTEGER NOT NULL REFERENCES celestial_body(id) ON DELETE CASCADE,
    tag     TEXT    NOT NULL,
    PRIMARY KEY (body_id, tag)
);

-- Rotas entre sistemas (as "cordas cósmicas" do mapa): arestas do grafo.
CREATE TABLE lane (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    system_a_id   INTEGER NOT NULL REFERENCES star_system(id) ON DELETE CASCADE,
    system_b_id   INTEGER NOT NULL REFERENCES star_system(id) ON DELETE CASCADE,
    lane_type     TEXT    NOT NULL DEFAULT 'cosmic_string',
    bidirectional INTEGER NOT NULL DEFAULT 1,
    notes         TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    CHECK (system_a_id <> system_b_id),
    CHECK (bidirectional IN (0, 1))
);

-- Um par de sistemas só pode ter uma rota, independente da ordem A/B.
CREATE UNIQUE INDEX idx_lane_pair
    ON lane(MIN(system_a_id, system_b_id), MAX(system_a_id, system_b_id));
CREATE INDEX idx_lane_system_a ON lane(system_a_id);
CREATE INDEX idx_lane_system_b ON lane(system_b_id);

-- Influência de cada facção dentro de um sistema (aba Geopolítica).
CREATE TABLE faction_influence (
    system_id         INTEGER NOT NULL REFERENCES star_system(id) ON DELETE CASCADE,
    faction_id        INTEGER NOT NULL REFERENCES faction(id) ON DELETE CASCADE,
    influence_value   INTEGER NOT NULL DEFAULT 0,
    trend             TEXT    NOT NULL DEFAULT 'steady',
    qualitative_label TEXT    NOT NULL DEFAULT '',
    PRIMARY KEY (system_id, faction_id),
    CHECK (influence_value BETWEEN 0 AND 100),
    CHECK (trend IN ('rising', 'falling', 'steady'))
);

CREATE INDEX idx_faction_influence_faction ON faction_influence(faction_id);
