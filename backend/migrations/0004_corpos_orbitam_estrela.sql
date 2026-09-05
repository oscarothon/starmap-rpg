-- Todo corpo que não é estrela passa a orbitar alguma coisa.
--
-- Antes, um planeta com parent_body_id NULL ficava "no centro do sistema" — o
-- lugar do baricentro, onde só cabem as estrelas. Isso rendia sistemas com
-- planetas orbitando o nada, principalmente vindos da geração aleatória, que
-- devolvia todos os corpos na raiz.
--
-- Aqui os órfãos são adotados pela estrela principal do próprio sistema (a de
-- menor orbital_order; empate resolvido pelo id, que é a ordem de criação).
-- Sistemas sem estrela nenhuma ficam como estão: não há a quem entregar os
-- corpos, e a aplicação continua aceitando esse caso enquanto o mestre não
-- cadastra a estrela.

UPDATE celestial_body
SET parent_body_id = (
    SELECT estrela.id
    FROM celestial_body AS estrela
    WHERE estrela.system_id = celestial_body.system_id
      AND estrela.body_type = 'star'
      AND estrela.parent_body_id IS NULL
    ORDER BY estrela.orbital_order, estrela.id
    LIMIT 1
)
WHERE body_type <> 'star'
  AND parent_body_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM celestial_body AS estrela
      WHERE estrela.system_id = celestial_body.system_id
        AND estrela.body_type = 'star'
        AND estrela.parent_body_id IS NULL
  );
