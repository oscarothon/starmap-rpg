-- Estrelas passam a ser corpos celestes.
--
-- Antes, um sistema guardava `star_count` (quantas) e `star_type` (um texto só),
-- o que tornava impossível representar um binário ou trinário: não havia onde
-- dizer a classe de cada estrela, nem qual planeta orbita qual.
--
-- Agora cada estrela é uma linha em celestial_body com body_type='star' e sua
-- própria classe espectral. Um corpo com parent_body_id NULL orbita o centro do
-- sistema; com parent_body_id preenchido, orbita aquele corpo.
--
-- As colunas star_count/star_type de star_system ficam como legado: não são
-- mais lidas nem escritas pela aplicação (removê-las exigiria recriar a tabela
-- central, o que este projeto evita).

ALTER TABLE celestial_body ADD COLUMN star_class TEXT NOT NULL DEFAULT '';

-- Estrela principal de cada sistema que ainda não tem nenhuma.
INSERT INTO celestial_body (system_id, name, body_type, orbital_order, star_class)
SELECT
    s.id,
    CASE WHEN s.star_count > 1 THEN s.name || ' A' ELSE s.name END,
    'star',
    0,
    CASE
        -- Palavras do texto livre antigo têm prioridade sobre a classe espectral.
        WHEN lower(s.star_type) LIKE '%supergigante%'    THEN 'SUPERGIGANTE'
        WHEN lower(s.star_type) LIKE '%subgigante%'      THEN 'F'
        WHEN lower(s.star_type) LIKE '%gigante%'         THEN 'GIGANTE_VERMELHA'
        WHEN lower(s.star_type) LIKE '%branca%'          THEN 'ANA_BRANCA'
        WHEN lower(s.star_type) LIKE '%marrom%'          THEN 'ANA_MARROM'
        WHEN lower(s.star_type) LIKE '%utrons%'          THEN 'ESTRELA_DE_NEUTRONS'
        WHEN lower(s.star_type) LIKE '%pulsar%'          THEN 'PULSAR'
        WHEN lower(s.star_type) LIKE '%buraco negro%'    THEN 'BURACO_NEGRO'
        WHEN lower(s.star_type) LIKE '%protoestrela%'    THEN 'PROTOESTRELA'
        WHEN lower(s.star_type) LIKE '%amarela%'         THEN 'G'
        WHEN lower(s.star_type) LIKE '%laranja%'         THEN 'K'
        WHEN lower(s.star_type) LIKE '%vermelha%'        THEN 'M'
        -- GLOB é sensível a maiúsculas (LIKE não é): pega a classe espectral.
        WHEN s.star_type GLOB '*O[0-9]*' THEN 'O'
        WHEN s.star_type GLOB '*B[0-9]*' THEN 'B'
        WHEN s.star_type GLOB '*A[0-9]*' THEN 'A'
        WHEN s.star_type GLOB '*F[0-9]*' THEN 'F'
        WHEN s.star_type GLOB '*G[0-9]*' THEN 'G'
        WHEN s.star_type GLOB '*K[0-9]*' THEN 'K'
        WHEN s.star_type GLOB '*M[0-9]*' THEN 'M'
        ELSE 'G'
    END
FROM star_system s
WHERE NOT EXISTS (
    SELECT 1 FROM celestial_body b WHERE b.system_id = s.id AND b.body_type = 'star'
);

-- Companheiras dos sistemas múltiplos, nomeadas B, C, D... como na astronomia.
-- A classe segue a hierarquia usual (a companheira costuma ser menor).
INSERT INTO celestial_body (system_id, name, body_type, orbital_order, star_class)
WITH RECURSIVE companheiras(system_id, nome_base, indice, total) AS (
    SELECT id, name, 2, star_count FROM star_system WHERE star_count > 1
    UNION ALL
    SELECT system_id, nome_base, indice + 1, total
    FROM companheiras
    WHERE indice + 1 <= total
)
SELECT
    system_id,
    nome_base || ' ' || char(64 + indice),
    'star',
    0,
    CASE indice WHEN 2 THEN 'K' WHEN 3 THEN 'M' ELSE 'M' END
FROM companheiras;
