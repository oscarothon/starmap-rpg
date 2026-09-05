# Planejamento e estado do projeto

Documento canônico de progresso do Mapa Estelar. Atualize a cada sessão de
trabalho: o que ficou pronto, o que ficou pendente e o que espera decisão.

Última atualização: **2026-09-05**

---

## Comece por aqui na próxima sessão

**Estado:** a primeira rodada da Fase 2 foi entregue e commitada em `bf2851f`
(nove pontos — ver "O que já está pronto"). A árvore está limpa, 243 testes
verdes, e o usuário rodou o app depois disso: o banco de desenvolvimento já tem
conteúdo novo criado à mão por ele (18 sistemas, 6 facções em 2026-09-05).

**Foco atual: Fase 2 — refinar o que já existe.** A decisão do usuário é iterar
e amadurecer o que está no ar antes de abrir funcionalidade nova. As decisões de
modelo tomadas em 2026-09-05 estão registradas logo abaixo e valem para quando as
fases seguintes começarem — não precisam ser perguntadas de novo.

**A ordem de trabalho vem do usuário.** A Fase 2 tem uma lista de candidatos (ver
"Roteiro"), mas o recorte de cada rodada é ele quem dá — ele disse
explicitamente que avisa quando for continuar. **Não escolher sozinho, não
começar a próxima rodada sem o recorte dele.**

**Duas perguntas continuam em aberto:**

1. **Backup e persistência do banco** — a única decisão que ainda bloqueia
   publicação (detalhada em "Decisões pendentes").
2. **Vocabulário da geração aleatória** — as tags e descrições ("Mundo velado",
   "Atmosfera corrosiva", os nomes sorteados) foram escritas sem referência do
   tom da campanha. O mesmo vale para os textos das **dez vocações de sistema** e
   dos **arranjos estelares** acrescentados em 2026-09-05, e para as descrições
   de rota que entraram no cenário de exemplo. Se o clima da mesa for outro —
   mais militar, mais horror, mais otimista —, tudo isso fica em
   `backend/modules/catalog/dados.py`, em `backend/modules/generator/gerador.py`
   e em `backend/seed.py`, e pode ser trocado inteiro. É ajuste de gosto, não
   trava nada.

---

## Decisões tomadas em 2026-09-05

Respostas às quatro perguntas que abriram a sessão. Ficam aqui para não serem
reabertas; o que cada uma implica está detalhado na fase correspondente.

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Modelo de acesso | **B — mestre edita; jogadores logam** para ver conteúdo restrito a eles. Exige modelo de usuários, papéis e permissão por rota. |
| 2 | Pontos de interesse | **Estruturados + descoberta por jogador**: nome, descrição, tipo, facção dona, nível de acesso e rastreio de quem já descobriu o quê. Só faz sentido depois da Fase 3. |
| 3 | Geração em sistemas múltiplos | **Distribuir os corpos entre as estrelas**: cada planeta ganha uma estrela hospedeira e a zona habitável passa a ser a dela. |
| 4 | Cor do sistema no mapa | **Descartada** a camada por classe espectral. A cor continua sendo informação política (facção soberana). |

A decisão 1 destrava a 2: a coluna "o que este jogador já descobriu" só existe
se houver jogador identificado. A decisão 3 é independente e cabe na Fase 2.

---

## Visão geral

Mapa estelar interativo e **editável pela própria interface**, para uma campanha
de RPG de mesa sci-fi. Referência visual e funcional:
<https://starmap.champlain.group>. Interface inteiramente em português.

Repositório: <https://github.com/oscarothon/starmap-rpg> (privado).

Estado atual: **243 testes verdes** — 132 pytest, 57 vitest, 54 Playwright.

---

## O que já está pronto

### Fase 1 — mapa e índice (2026-09-04)

**Mapa** — pan, zoom com foco no cursor e enquadramento automático (câmera
própria, sem dependências externas); sistemas em SVG com halo da facção
soberana; rotas estilizadas por tipo; rótulos de região hierárquicos com nível
de detalhe por zoom; busca com sugestões e centralização.

**Camadas** — mapa base, rotas, sistemas, nomes de região e influência
geopolítica (mosaico colorido por facção em Canvas 2D, com legenda), com a
preferência salva no navegador.

**Painel do sistema** em três abas — Visão Geral, Sistema e Geopolítica, com
"Acesso restrito" quando o sistema é classificado.

**Modo editor** — criar sistema clicando no mapa, arrastar para reposicionar,
ligar dois sistemas com a ferramenta de rota, editar campos no painel, gerenciar
corpos celestes e influências, excluir com aviso de impacto em cascata.

**Índice de Sistemas** — tabela com todas as métricas, filtro textual, chips de
facção, ordenação por coluna e agrupamento por região; clicar numa linha abre o
sistema no mapa.

**Backend** — Flask 3 + SQLite (SQL puro), migrations numeradas aplicadas na
subida, módulos por domínio registrados em `FEATURE_MODULES`, núcleo reutilizável
(`Table`, `build_crud_blueprint`, validação declarativa).

### Endurecimento de segurança (2026-09-04)

Diretrizes registradas em `CLAUDE.md` e aplicadas ao código: configuração por
ambiente sem segredos no código, `.env` fora do Git, identificadores SQL
validados, busca sem curingas, validadores de cor e URL contra injeção de CSS e
`javascript:`, limites de tamanho em todo texto livre, handler global de erro sem
stack trace, `FLASK_DEBUG` desligado por padrão, cabeçalhos de segurança (CSP,
HSTS, nosniff, X-Frame-Options) e a trava `STARMAP_SOMENTE_LEITURA`.

### Aprimoramento dos componentes (2026-09-05)

**Modelo:** estrelas passaram a ser corpos celestes com classe espectral própria
(migration `0002`, que converteu os dados existentes), o que destravou binários e
trinários e a hierarquia real de órbitas. As colunas `star_count`/`star_type` de
`star_system` viraram legado morto — não são mais lidas nem escritas.

**Catálogo e glossário:** `backend/modules/catalog/dados.py` centraliza classes
de estrela (15, da anã vermelha ao buraco negro), tipos de corpo e de rota,
níveis de região, faixas de população e as seis métricas com o significado de
cada uma das cinco faixas. A página `/glossario` renderiza tudo isso, e os mesmos
dados alimentam os dropdowns e a validação.

**Geração aleatória** (`backend/modules/generator/`): propostas de população e
métricas coerentes entre si (um sistema desabitado não sai com economia de
metrópole), sorteio de nome, e geração de corpos que respeita a zona habitável da
estrela — gigantes gasosos só além da linha de gelo, luas concentradas neles,
cinturão eventual.

**Interface:** administração de regiões e facções em `/administracao`, com aviso
do impacto de cada exclusão; diagrama do sistema reescrito, com múltiplas
estrelas em torno do baricentro, hierarquia de órbitas e nome do corpo no
mouseover; corpos celestes clicáveis na lista e no diagrama, abrindo a ficha —
base para os pontos de interesse; população sem barra, só número e faixa; e a
órbita vazia renomeada para "centro do sistema".

**Proteção de dados:** `backend.seed` passou a recusar apagar bancos que contêm
sistemas criados à mão, exigindo `--forcar`. A trava nasceu de um incidente real:
o seed foi rodado por engano contra o banco de desenvolvimento e apagou um
sistema autoral, recuperado depois das páginas livres do arquivo SQLite.

### Fase 2 — primeira rodada de refinamento (2026-09-05)

Nove pontos levantados pelo usuário usando o mapa de verdade. Todos entregues.

**Rotas.** "Corda cósmica" virou **Hyperlane** (migration `0003`, que renomeou o
código junto com o rótulo — o catálogo é a fonte única, então os dois andam
juntos). A opção de **mão dupla saiu**: rota liga os dois sistemas nos dois
sentidos, sempre; a coluna `bidirectional` fica no banco como legado, sem ser
lida nem escrita. A **descrição da rota, que não aparecia em lugar nenhum**,
ganhou painel próprio: clicar numa rota seleciona ela e abre tipo, significado e
descrição — em qualquer modo, com editar/excluir só no modo editor. E o mapa
ganhou **legenda dos tracejados** das rotas presentes, ao lado da legenda de
facções.

> Ao fazer isso apareceu o motivo de a edição de rota ser tão difícil de acionar:
> o `setPointerCapture` do palco redireciona o clique, então o `click` nunca
> chegava na linha. A seleção passou a ser resolvida no `pointerup`, junto com o
> clique em sistema. Também caiu um bug antigo: `Node.append(null)` escrevia o
> texto "null" no painel — agora tudo passa por `anexar()`.

**Corpos celestes.** Planetas não ficam mais orbitando o nada: a geração
distribui os corpos **entre as estrelas** do sistema, e a migration `0004`
adotou os órfãos já existentes na estrela principal. O centro do sistema passou a
ser exclusivo das estrelas, validado no backend e refletido no formulário (a
opção "centro do sistema" só aparece para estrela ou enquanto o sistema não tem
nenhuma). Sistemas múltiplos ganharam **arranjos**: única, binária estreita
(planetas circumbinários), binária ampla (cada estrela com seu cortejo),
hierárquica (companheira orbitando a primária) e trinária.

**Geração aleatória.** O botão de sortear métricas parecia travado: em ~30% dos
sorteios saía um sistema desabitado, que não tem métrica nenhuma, e a tela não
mudava. Agora o botão mostra que está trabalhando, não aceita clique duplo e
**diz o que saiu** ("Sorteado: Sistema morto · Desabitado · sem métricas").
Junto vieram **10 vocações** (bastião militar, polo industrial, capital,
agrícola, minerador, científico, entreposto, fronteira, sem lei, sistema morto),
que restringem os perfis de ocupação plausíveis e enviesam as métricas.

**Glossário.** Corrigido o estouro das faixas de população (`10.000.000.000+`
invadia a coluna vizinha) e acrescentadas as seções de arranjos estelares e
vocações, além da amostra do traço em cada tipo de rota.

---

## Roteiro

Ordem escolhida em 2026-09-05: **amadurecer o que existe antes de abrir módulo
novo**. Autenticação vem antes dos pontos de interesse porque a descoberta por
jogador depende de haver jogador identificado.

```
Fase 2  refinamento do que já existe        ← em andamento
Fase 3  autenticação (modelo B)             ← destrava publicação e a Fase 4
Fase 4  pontos de interesse                 ← depende da Fase 3
Fase 5  módulos de campanha (boletins, procurados, corsários, conflitos)
```

### Fase 2 — refinamento do que já existe (em andamento)

Nada aqui é módulo novo: é acabamento do que a Fase 1 entregou. **A lista abaixo
são candidatos, não uma fila aprovada** — o usuário dá o recorte de cada rodada.
A primeira rodada (nove pontos) está em "O que já está pronto".

**Observado em uso, ainda não tratado:**

- **Primeira carga do mapa vem zerada logo depois de subir o servidor.** A página
  chega antes de o Flask terminar de aplicar as migrations, e `carregarMapa`
  falha calada: o mapa fica em "0 sistemas" até um F5. Só acontece na subida, não
  no uso normal. Conserto provável: repetir a chamada em caso de falha no
  `carregarMapa` (`static/js/mapa.js`), com aviso se persistir.
- **Um teste E2E falhou uma vez em seis execuções** (`toBeVisible`), sem se
  repetir em quatro rodadas limpas seguidas depois, e sem que o nome tenha sido
  capturado. A suspeita é corrida na primeira carga da página — possivelmente a
  mesma causa do item acima. Se reaparecer, capturar o nome antes de tratar como
  ruído.

**Dívida técnica anotada, sem urgência:**

- Limpeza das colunas legadas `star_count`/`star_type` de `star_system` e
  `bidirectional` de `lane`. Junto com elas, os DEFAULT que ficaram para trás
  (`lane_type` ainda nasce como `'cosmic_string'` para quem inserir por SQL
  direto; a aplicação sempre preenche o campo).
- Rate limiting nas escritas da API.
- Auditoria de dependências (`pip-audit` / `npm audit`).
- Histórico de alterações do mapa (equivalente ao "Recent Changes" da
  referência).

**Polimento de interface:** a definir com o usuário, a partir do que incomoda ao
usar o mapa e o editor de verdade entre as sessões.

### Fase 3 — autenticação (modelo B)

Modelo escolhido: **mestre edita; jogadores logam para ver conteúdo restrito a
eles.** Substitui a contenção atual (servidor em `127.0.0.1` +
`STARMAP_SOMENTE_LEITURA=1`), que não resolve edição remota.

Escopo previsto, seguindo as diretrizes de segurança do `CLAUDE.md`:

- Migration nova com `app_user` (papel `mestre` | `jogador`, ativo/inativo) e
  tabela de sessões do lado do servidor — guardando o **hash** do token, para que
  vazamento do banco não entregue sessões válidas.
- Hash de senha **Argon2id** com salt por usuário (dependência `argon2-cffi`,
  verificada como instalável no Python 3.9 desta máquina) — nunca hash simples.
- Cookie de sessão `HttpOnly` + `Secure` + `SameSite=Lax`; token CSRF exigido em
  toda escrita.
- Verificação de autorização **por rota**, no backend: esconder o botão na
  interface não é controle de acesso.
- **Modo editor restrito ao mestre** (pedido em 2026-09-05). Hoje o botão "Modo
  editor" e o atalho `E` estão abertos a qualquer um que abra o mapa. Passam a
  aparecer só para o mestre autenticado — e, como esconder botão não é controle
  de acesso, é a autorização por rota que efetivamente barra a escrita. Vale
  para as telas de administração (`/administracao`) pelo mesmo motivo.
- Página de login em português e um comando de linha para criar o primeiro
  mestre (sem cadastro aberto na web).

**Sub-decisão que fica para o início da fase:** a leitura anônima do mapa
continua liberada (público lê o que não é restrito) ou tudo passa a exigir login?
Uma variável de ambiente pode cobrir os dois, mas o padrão precisa ser escolhido.

### Fase 4 — pontos de interesse

Depende da Fase 3. A ficha do corpo celeste já existe e está vazia esperando por
isto; os corpos já são clicáveis na lista e no diagrama.

Forma decidida: além de **nome, descrição e tipo** (tipo vindo do catálogo, como
todo enumerado do projeto), cada ponto guarda **facção dona** e **nível de
acesso** (público / restrito / secreto), e o sistema rastreia **o que cada
jogador já descobriu**.

Consequências de modelo: tabela de pontos com FK para `celestial_body` e para
`faction`, mais uma tabela de descoberta ligando ponto e usuário. A filtragem por
acesso é feita **no backend**, na serialização — um ponto secreto não pode chegar
ao navegador do jogador nem escondido no JSON.

### Fase 5 — módulos de campanha

Cada um entra como pasta em `backend/modules/`, migration nova com tabelas
referenciando as centrais por FK, e — quando aparecer no mapa — uma camada
registrada no `LayerManager`. Nenhum exige refatoração do que já existe.

- **Boletins** — feed de notícias/lore por sistema e região, com leitura e
  filtros; marcadores no mapa como camada nova.
- **Procurados** — quadro de recompensas (piratas), com zonas de atividade
  pirata como camada de heatmap.
- **Registro de Corsários** — ranking de caçadores de recompensa.
- **Rastreador de Conflitos** — guerras entre facções, com barra proporcional de
  lados e destaque no mapa.

### Descartado

- **Camada de cor por classe espectral** (decisão 4). A cor do sistema no mapa
  continua vindo da facção soberana; uma segunda dimensão de cor competiria com o
  mosaico de influência.

---

## Decisões pendentes

### Backup e persistência do banco — bloqueia publicação

**Situação:** o conteúdo vive num arquivo SQLite sem backup. Em Railway/Render o
disco é efêmero sem volume persistente — **um deploy apagaria a campanha
inteira**. Para material autoral acumulado, o risco de perda é tão sério quanto o
de segurança.

**Decisão necessária:** onde a campanha vai morar?

- **A.** Local apenas, com rotina de backup automático do arquivo (mais simples).
- **B.** Railway/Render com volume persistente + backup periódico para fora.
- **C.** Migrar para Postgres gerenciado (backup do provedor; exige adaptar o
  acesso a dados, que já está isolado nos repositórios por módulo).

### Resolvida: autenticação

Era a outra decisão que bloqueava publicação. Resolvida em 2026-09-05 pela
**opção B** — ver a Fase 3. Enquanto ela não é implementada, a contenção continua
sendo o servidor local e `STARMAP_SOMENTE_LEITURA=1` para publicar em leitura.
