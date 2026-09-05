# Planejamento e estado do projeto

Documento canônico de progresso do Mapa Estelar. Atualize a cada sessão de
trabalho: o que ficou pronto, o que ficou pendente e o que espera decisão.

Última atualização: **2026-09-05**

---

## Visão geral

Mapa estelar interativo e **editável pela própria interface**, para uma campanha
de RPG de mesa sci-fi. Referência visual e funcional:
<https://starmap.champlain.group>. Interface inteiramente em português.

Repositório: <https://github.com/oscarothon/starmap-rpg> (privado).

---

## Fase 1 — concluída (2026-09-04)

**Mapa**
- Pan, zoom com foco no cursor, enquadramento automático (câmera própria, sem
  dependências externas)
- Sistemas em SVG com halo da facção soberana; rotas estilizadas por tipo
- Rótulos de região hierárquicos com nível de detalhe por zoom
- Busca com sugestões e centralização

**Camadas** (mapa base, rotas, sistemas, nomes de região, influência
geopolítica) com preferência salva no navegador. A influência desenha o mosaico
colorido por facção em Canvas 2D, com legenda.

**Painel do sistema** em três abas — Visão Geral (aviso, estatísticas, diagrama
orbital), Sistema (corpos celestes com tags e luas aninhadas), Geopolítica
(população, equilíbrio de poder, medidores; "Acesso restrito" quando o sistema é
classificado).

**Modo editor** — criar sistema clicando no mapa, arrastar para reposicionar,
ligar dois sistemas com a ferramenta de rota, editar campos no painel, gerenciar
corpos celestes e influências, excluir com aviso de impacto em cascata.

**Índice de Sistemas** — tabela com todas as métricas, filtro textual, chips de
facção, ordenação por coluna e agrupamento por região; clicar numa linha abre o
sistema no mapa.

**Backend** — Flask 3 + SQLite (SQL puro), migrations numeradas aplicadas na
subida, módulos por domínio registrados em `FEATURE_MODULES`, núcleo reutilizável
(`Table`, `build_crud_blueprint`, validação declarativa).

**Testes** — 65 pytest + 39 vitest + 22 Playwright, todos verdes.

## Endurecimento de segurança — concluído (2026-09-04)

Diretrizes registradas em `CLAUDE.md` (seção "Diretrizes de segurança") e
aplicadas ao código: configuração por ambiente sem segredos no código, `.env`
fora do Git, identificadores SQL validados, busca sem curingas, validadores de
cor e URL contra injeção de CSS e `javascript:`, limites de tamanho em todo texto
livre, handler global de erro sem stack trace, `FLASK_DEBUG` desligado por
padrão, cabeçalhos de segurança (CSP, HSTS, nosniff, X-Frame-Options) e a trava
`STARMAP_SOMENTE_LEITURA`.

## Aprimoramento dos componentes — concluído (2026-09-05)

**Modelo:** estrelas passaram a ser corpos celestes com classe espectral
própria (migration `0002`), o que destravou binários e trinários e a hierarquia
real de órbitas. As colunas `star_count`/`star_type` viraram legado morto.

**Catálogo e glossário:** `backend/modules/catalog/dados.py` centraliza classes
de estrela (15, da anã vermelha ao buraco negro), tipos de corpo e de rota,
níveis de região, faixas de população e as seis métricas com o significado de
cada uma das cinco faixas. A página `/glossario` renderiza tudo isso, e os
mesmos dados alimentam os dropdowns.

**Geração aleatória** (`backend/modules/generator/`): propostas de população e
métricas coerentes entre si (um sistema desabitado não sai com economia de
metrópole), sorteio de nome, e geração de corpos que respeita a zona habitável
da estrela — gigantes gasosos só além da linha de gelo, luas concentradas neles,
cinturão eventual.

**Interface:** administração de regiões e facções em `/administracao` (com aviso
de impacto na exclusão); diagrama do sistema reescrito, com múltiplas estrelas,
baricentro, hierarquia e nome do corpo no mouseover; corpos celestes clicáveis
na lista e no diagrama, abrindo a ficha — que é onde os pontos de interesse
entram depois; população sem barra, só número e faixa; e a órbita vazia agora se
chama "centro do sistema".

**Proteção de dados:** o seed passou a recusar apagar bancos que contenham
sistemas criados à mão (exige `--forcar`).

---

## Decisões pendentes — retomar por aqui

### 1. Autenticação de mestre (bloqueia publicação com edição)

**Situação:** a aplicação não tem autenticação nenhuma. Quem alcança o servidor
pode criar, editar e excluir qualquer coisa via API. Hoje isso está contido
porque o servidor escuta só em `127.0.0.1`; a trava `STARMAP_SOMENTE_LEITURA=1`
permite publicar o mapa em modo leitura com segurança, mas não resolve edição
remota.

**Decisão necessária:** qual modelo de acesso a campanha precisa?
- **A.** Mestre único autenticado edita; jogadores leem sem login (mais simples).
- **B.** Mestre edita; jogadores fazem login para ver conteúdo restrito a eles
  (permite segredos por jogador, exige modelo de usuários e permissões).
- **C.** Continuar sem autenticação, editando só localmente e publicando um
  espelho somente leitura.

**Se A ou B:** hash Argon2id com salt por usuário, cookie de sessão
`HttpOnly` + `Secure` + `SameSite=Lax`, token CSRF nas escritas e verificação de
autorização por rota (nunca confiar na interface esconder o botão).

### 2. Backup e persistência do banco (bloqueia qualquer hospedagem)

**Situação:** o conteúdo vive num arquivo SQLite sem backup. Em Railway/Render o
disco é efêmero sem volume persistente — **um deploy apagaria a campanha
inteira**. Para material autoral acumulado, o risco de perda é tão sério quanto
o de segurança.

**Decisão necessária:** onde a campanha vai morar?
- **A.** Local apenas, com rotina de backup automático do arquivo (mais simples).
- **B.** Railway/Render com volume persistente + backup periódico para fora.
- **C.** Migrar para Postgres gerenciado (backup do provedor; exige adaptar o
  acesso a dados, que já está isolado nos repositórios por módulo).

---

## Próximas fases (ordem a definir)

Cada módulo entra como pasta em `backend/modules/`, migration nova com tabelas
referenciando as centrais por FK, e — quando aparecer no mapa — uma camada
registrada no `LayerManager`. Nenhum exige refatoração do que já existe.

- **Boletins** — feed de notícias/lore por sistema e região, com leitura e
  filtros; marcadores no mapa como camada nova.
- **Procurados** — quadro de recompensas (piratas), com zonas de atividade
  pirata como camada de heatmap.
- **Registro de Corsários** — ranking de caçadores de recompensa.
- **Rastreador de Conflitos** — guerras entre facções, com barra proporcional de
  lados e destaque no mapa.

Melhorias técnicas anotadas, sem urgência: rate limiting nas escritas, auditoria
de dependências (`pip-audit` / `npm audit`) e histórico de alterações do mapa
(equivalente ao "Recent Changes" da referência).
