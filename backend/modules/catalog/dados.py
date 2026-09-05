"""Catálogos do jogo: a fonte única de verdade do conteúdo enumerado.

O que está aqui alimenta ao mesmo tempo os dropdowns dos formulários, a
validação do backend e a página de Glossário. Acrescentar um tipo de estrela ou
uma métrica é editar este arquivo — nada mais.

Campos usados por cada catálogo:
  codigo     valor gravado no banco
  nome       rótulo curto exibido na interface
  resumo     uma linha, para dropdown e tooltip
  descricao  texto do glossário
  peso       frequência relativa na geração aleatória (0 = nunca sorteado)
"""

# --- Classes de estrela ------------------------------------------------------
# Baseadas na classificação de Harvard (O B A F G K M) mais os objetos
# compactos e estágios finais que rendem boa ambientação.

CLASSES_DE_ESTRELA = (
    {
        "codigo": "O",
        "nome": "Azul (Tipo O)",
        "resumo": "Gigante azul, extremamente quente e de vida curta",
        "descricao": (
            "As estrelas mais quentes e massivas da sequência principal, acima de "
            "30.000 K. Queimam o próprio combustível em poucos milhões de anos e "
            "terminam em supernova. Banham o sistema inteiro em radiação "
            "ultravioleta: qualquer colônia depende de blindagem pesada."
        ),
        "cor": "#9bb0ff",
        "temperatura": "30.000 K ou mais",
        "peso": 0.3,
    },
    {
        "codigo": "B",
        "nome": "Azul-branca (Tipo B)",
        "resumo": "Muito quente e luminosa, vida de algumas centenas de milhões de anos",
        "descricao": (
            "Entre 10.000 e 30.000 K. Ainda hostis à vida, mas duram o bastante "
            "para que planetas se formem. Costumam iluminar nebulosas vizinhas, o "
            "que rende sistemas visualmente espetaculares."
        ),
        "cor": "#aabfff",
        "temperatura": "10.000 a 30.000 K",
        "peso": 1.5,
    },
    {
        "codigo": "A",
        "nome": "Branca (Tipo A)",
        "resumo": "Branca e brilhante, zona habitável distante",
        "descricao": (
            "Entre 7.500 e 10.000 K. Brilhantes e de tempo de vida moderado. A "
            "zona habitável fica longe da estrela, o que costuma empurrar as "
            "colônias para as luas dos gigantes gasosos."
        ),
        "cor": "#cad7ff",
        "temperatura": "7.500 a 10.000 K",
        "peso": 4,
    },
    {
        "codigo": "F",
        "nome": "Branco-amarela (Tipo F)",
        "resumo": "Um pouco mais quente que o Sol, boa candidata a colonização",
        "descricao": (
            "Entre 6.000 e 7.500 K. Estáveis por bilhões de anos e com zona "
            "habitável ampla — depois das do tipo G, são os alvos preferidos de "
            "qualquer plano de colonização."
        ),
        "cor": "#f8f7ff",
        "temperatura": "6.000 a 7.500 K",
        "peso": 8,
    },
    {
        "codigo": "G",
        "nome": "Amarela (Tipo G)",
        "resumo": "Como o Sol: o padrão-ouro para mundos habitáveis",
        "descricao": (
            "Entre 5.200 e 6.000 K, a mesma classe do Sol. Vida longa, radiação "
            "tolerável e zona habitável em distância confortável. Sistemas assim "
            "são disputados por todas as potências."
        ),
        "cor": "#fff4ea",
        "temperatura": "5.200 a 6.000 K",
        "peso": 14,
    },
    {
        "codigo": "K",
        "nome": "Laranja (Tipo K)",
        "resumo": "Mais fria e muito mais duradoura que o Sol",
        "descricao": (
            "Entre 3.700 e 5.200 K. Vivem dezenas de bilhões de anos e emitem "
            "menos radiação ionizante que as amarelas. Muitos astrobiólogos as "
            "consideram as melhores anfitriãs para vida de longo prazo."
        ),
        "cor": "#ffd2a1",
        "temperatura": "3.700 a 5.200 K",
        "peso": 18,
    },
    {
        "codigo": "M",
        "nome": "Anã vermelha (Tipo M)",
        "resumo": "A estrela mais comum da galáxia; fraca, fria e longeva",
        "descricao": (
            "Abaixo de 3.700 K e responsáveis por três em cada quatro estrelas da "
            "galáxia. A zona habitável é tão próxima que os planetas costumam ficar "
            "com rotação síncrona — um lado em dia perpétuo, outro em noite eterna. "
            "Explosões estelares frequentes castigam as atmosferas."
        ),
        "cor": "#ffcc6f",
        "temperatura": "2.400 a 3.700 K",
        "peso": 45,
    },
    {
        "codigo": "GIGANTE_VERMELHA",
        "nome": "Gigante vermelha",
        "resumo": "Estrela idosa e inchada, que já engoliu seus mundos internos",
        "descricao": (
            "Fase final de estrelas de massa parecida com a do Sol: o núcleo "
            "colapsa, as camadas externas incham e a estrela passa a ocupar o "
            "espaço onde antes havia planetas. Sistemas assim guardam ruínas de "
            "mundos que já não existem."
        ),
        "cor": "#ff8a5c",
        "temperatura": "3.000 a 4.500 K",
        "peso": 3,
    },
    {
        "codigo": "SUPERGIGANTE",
        "nome": "Supergigante",
        "resumo": "Colosso instável, candidata a supernova",
        "descricao": (
            "Estrelas centenas de vezes maiores que o Sol, em seus últimos "
            "estágios. Podem explodir em supernova a qualquer momento na escala "
            "astronômica — o que torna qualquer investimento no sistema uma aposta."
        ),
        "cor": "#ffb07c",
        "temperatura": "3.500 a 20.000 K",
        "peso": 1,
    },
    {
        "codigo": "ANA_BRANCA",
        "nome": "Anã branca",
        "resumo": "Núcleo exposto de uma estrela morta, do tamanho de um planeta",
        "descricao": (
            "O que sobra quando uma estrela como o Sol esgota o combustível: um "
            "núcleo do tamanho da Terra com metade da massa solar, esfriando por "
            "bilhões de anos. Densa a ponto de uma colher do material pesar "
            "toneladas."
        ),
        "cor": "#e8f4ff",
        "temperatura": "8.000 a 40.000 K",
        "peso": 3,
    },
    {
        "codigo": "ANA_MARROM",
        "nome": "Anã marrom",
        "resumo": "Massa intermediária: grande demais para planeta, pequena para estrela",
        "descricao": (
            "Nunca acumulou massa suficiente para sustentar fusão de hidrogênio. "
            "Brilha fracamente no infravermelho enquanto esfria. Sistemas assim são "
            "escuros e frios, mas úteis como esconderijo: quase não aparecem em "
            "varredura de longo alcance."
        ),
        "cor": "#a86b5c",
        "temperatura": "300 a 2.400 K",
        "peso": 2,
    },
    {
        "codigo": "ESTRELA_DE_NEUTRONS",
        "nome": "Estrela de nêutrons",
        "resumo": "Resto de supernova com densidade absurda e gravidade brutal",
        "descricao": (
            "Vinte quilômetros de diâmetro concentrando mais massa que o Sol. "
            "Campo magnético e gravidade tornam a aproximação letal para naves sem "
            "blindagem inercial. Valiosa para pesquisa e navegação de precisão."
        ),
        "cor": "#dcedff",
        "temperatura": "600.000 K ou mais",
        "peso": 0.7,
    },
    {
        "codigo": "PULSAR",
        "nome": "Pulsar",
        "resumo": "Estrela de nêutrons giratória que varre o espaço com feixes",
        "descricao": (
            "Uma estrela de nêutrons em rotação rápida cujos feixes de radiação "
            "cruzam o sistema com regularidade cronométrica. Serve de farol natural "
            "para navegação interestelar — e de perigo para quem cruza o feixe."
        ),
        "cor": "#c7f5ff",
        "temperatura": "600.000 K ou mais",
        "peso": 0.4,
    },
    {
        "codigo": "BURACO_NEGRO",
        "nome": "Buraco negro",
        "resumo": "Colapso total: nem a luz escapa do horizonte de eventos",
        "descricao": (
            "O ponto final das estrelas mais massivas. O que se vê é o disco de "
            "acreção — matéria despedaçada e aquecida antes de cruzar o horizonte. "
            "Sistemas com buraco negro costumam ser interditados, o que os torna "
            "atraentes para quem quer sumir."
        ),
        "cor": "#6b5ce0",
        "temperatura": "—",
        "peso": 0.2,
    },
    {
        "codigo": "PROTOESTRELA",
        "nome": "Protoestrela",
        "resumo": "Estrela em formação, ainda envolta no disco que a alimenta",
        "descricao": (
            "Ainda não iniciou a fusão: brilha pelo calor do próprio colapso, "
            "cercada por um disco de poeira onde planetas estão se formando. "
            "Instável e imprevisível, mas rica em matéria-prima."
        ),
        "cor": "#ffa9d0",
        "temperatura": "1.000 a 4.000 K",
        "peso": 0.5,
    },
)

# --- Tipos de corpo celeste --------------------------------------------------

TIPOS_DE_CORPO = (
    {
        "codigo": "star",
        "nome": "Estrela",
        "resumo": "O corpo central do sistema",
        "descricao": (
            "Sistemas com mais de uma estrela são comuns: as estrelas orbitam um "
            "centro de massa comum, e os planetas orbitam uma delas ou o conjunto."
        ),
    },
    {
        "codigo": "planet",
        "nome": "Planeta",
        "resumo": "Corpo que orbita uma estrela e limpou a própria órbita",
        "descricao": (
            "De mundos rochosos a gigantes gasosos. A distância à estrela define "
            "quase tudo: temperatura, atmosfera e se dá para respirar sem ajuda."
        ),
    },
    {
        "codigo": "moon",
        "nome": "Lua",
        "resumo": "Satélite natural de um planeta",
        "descricao": (
            "Luas de gigantes gasosos são o alvo mais frequente de colonização "
            "fora da zona habitável: costumam ter gelo, e o aquecimento das marés "
            "mantém oceanos líquidos sob a crosta."
        ),
    },
    {
        "codigo": "belt",
        "nome": "Cinturão",
        "resumo": "Faixa de asteroides ou detritos em órbita",
        "descricao": (
            "Matéria-prima acessível sem sair de um poço gravitacional profundo — "
            "por isso cinturões concentram mineração, e com ela disputa."
        ),
    },
    {
        "codigo": "station",
        "nome": "Estação",
        "resumo": "Estrutura artificial permanente em órbita",
        "descricao": (
            "Portos, estaleiros e postos militares. Aparecem onde há tráfego a "
            "controlar ou recurso a escoar."
        ),
    },
    {
        "codigo": "anomaly",
        "nome": "Anomalia",
        "resumo": "Fenômeno ou objeto que não se encaixa nas categorias conhecidas",
        "descricao": (
            "Ruína de origem desconhecida, distorção gravitacional, sinal sem "
            "emissor. O que a Autoridade classifica como anomalia costuma ser o que "
            "ela não quer explicar."
        ),
    },
)

# --- Métricas do sistema -----------------------------------------------------
# As faixas descrevem o que cada valor significa em jogo, para o glossário e
# para leitura rápida na ficha do sistema.

FAIXAS_PADRAO = ((0, 20), (21, 40), (41, 60), (61, 80), (81, 100))
NOMES_DE_FAIXA = ("Crítico", "Baixo", "Mediano", "Alto", "Excepcional")

METRICAS = (
    {
        "codigo": "economy",
        "nome": "Economia",
        "resumo": "Volume e saúde da atividade econômica do sistema",
        "descricao": (
            "Mede quanta riqueza circula: comércio, serviços, crédito disponível. "
            "Um sistema com economia alta sustenta preços melhores, contratos "
            "maiores e mais gente disposta a pagar por trabalho perigoso."
        ),
        "faixas": (
            "Economia de subsistência: escambo, favores e o que a nave trouxer.",
            "Circula pouco dinheiro; contratos pequenos e pagamento incerto.",
            "Mercado funcional, com preços estáveis e crédito para quem tem nome.",
            "Praça financeira regional: capital farto e concorrência dura.",
            "Um dos centros econômicos do braço; o que se decide aqui move preços longe.",
        ),
    },
    {
        "codigo": "industry",
        "nome": "Indústria",
        "resumo": "Capacidade de extrair, processar e construir",
        "descricao": (
            "Estaleiros, refinarias, linhas de montagem. Define o que pode ser "
            "consertado, fabricado ou reabastecido sem sair do sistema."
        ),
        "faixas": (
            "Sem parque industrial: peça quebrada é peça perdida.",
            "Oficinas improvisadas dão conta de reparo simples.",
            "Manufatura local cobre manutenção completa e construção leve.",
            "Estaleiros capazes de erguer naves de médio porte.",
            "Complexo industrial de escala militar: constrói frotas.",
        ),
    },
    {
        "codigo": "innovation",
        "nome": "Inovação",
        "resumo": "Pesquisa, engenharia e adoção de tecnologia nova",
        "descricao": (
            "Universidades, laboratórios e a disposição de aplicar o que descobrem. "
            "Sistemas inovadores oferecem equipamento de ponta — e atraem espionagem."
        ),
        "faixas": (
            "Tecnologia herdada e mal compreendida; ninguém projeta nada novo.",
            "Adapta o que chega de fora, sem desenvolver.",
            "Engenharia competente, com pesquisa aplicada em áreas pontuais.",
            "Centros de pesquisa reconhecidos; protótipos circulam antes do resto.",
            "Fronteira do conhecimento: o que nasce aqui redefine o padrão.",
        ),
    },
    {
        "codigo": "information",
        "nome": "Informação",
        "resumo": "Fluxo, alcance e confiabilidade das comunicações",
        "descricao": (
            "Densidade de rede, acesso a arquivos e velocidade com que uma notícia "
            "atravessa o sistema. Também mede o quanto é difícil esconder algo."
        ),
        "faixas": (
            "Silêncio de rádio: notícia viaja com quem viaja.",
            "Rede precária e censurada; boato vale mais que registro.",
            "Comunicação confiável dentro do sistema, lenta para fora.",
            "Nó de retransmissão regional, com arquivos abertos e imprensa ativa.",
            "Centro nervoso de informação: nada acontece no braço sem eco aqui.",
        ),
    },
    {
        "codigo": "stability",
        "nome": "Estabilidade",
        "resumo": "Ordem pública, controle territorial e continuidade do governo",
        "descricao": (
            "Mede o quanto a autoridade local realmente governa. Estabilidade baixa "
            "não significa ausência de lei — significa que a lei muda de dono."
        ),
        "faixas": (
            "Conflito aberto ou colapso: nenhum poder controla o sistema inteiro.",
            "Autoridade contestada, com zonas fora de controle e violência rotineira.",
            "Ordem mantida com esforço; tensão sob a superfície.",
            "Governo firme, com policiamento eficaz e transição pacífica de poder.",
            "Controle absoluto — o que pode significar paz ou vigilância total.",
        ),
    },
    {
        "codigo": "quality_of_life",
        "nome": "Qualidade de vida",
        "resumo": "Como é, na prática, viver ali",
        "descricao": (
            "Saúde, moradia, ar respirável, tempo livre. Um sistema pode ser rico e "
            "industrializado e ainda assim ser um lugar terrível para nascer."
        ),
        "faixas": (
            "Sobrevivência: ar racionado, doença endêmica, expectativa de vida curta.",
            "Precário — trabalho pesado, moradia ruim, saúde de emergência apenas.",
            "Vida digna para a maioria, com desigualdade visível.",
            "Confortável: saúde ampla, moradia boa e tempo para algo além do trabalho.",
            "Referência de bem-estar no braço; quem nasce aqui raramente sai.",
        ),
    },
)

# --- Tipos de rota -----------------------------------------------------------

TIPOS_DE_ROTA = (
    {
        "codigo": "hyperlane",
        "nome": "Hyperlane",
        "resumo": "Rota estável padrão entre dois sistemas",
        "descricao": (
            "A infraestrutura básica da navegação interestelar: previsível, mapeada "
            "e usada por qualquer nave com carta de navegação atualizada."
        ),
    },
    {
        "codigo": "trade_route",
        "nome": "Rota comercial",
        "resumo": "Corredor de tráfego intenso, patrulhado e balizado",
        "descricao": (
            "Rota com volume comercial alto o bastante para justificar patrulha e "
            "manutenção. Mais segura, mais movimentada e mais vigiada."
        ),
    },
    {
        "codigo": "unstable",
        "nome": "Instável",
        "resumo": "Passagem irregular, sujeita a falha de trânsito",
        "descricao": (
            "Funciona, mas não sempre — e nem sempre entrega a nave onde deveria. "
            "Atalho de quem tem pressa ou não pode usar as rotas oficiais."
        ),
    },
    {
        "codigo": "restricted",
        "nome": "Restrita",
        "resumo": "Trânsito controlado por autorização",
        "descricao": (
            "Bloqueada por decreto, quarentena ou presença militar. Cruzá-la sem "
            "autorização é ato hostil."
        ),
    },
)

# --- Arranjos de sistemas múltiplos ------------------------------------------
# Como as estrelas de um sistema se organizam entre si. O arranjo decide onde os
# planetas podem se formar, então a geração aleatória sorteia um destes antes de
# distribuir os corpos.
#
#   peso       frequência relativa no sorteio
#   estrelas   quantidades de estrelas compatíveis com o arranjo

ARRANJOS_ESTELARES = (
    {
        "codigo": "unica",
        "nome": "Estrela única",
        "resumo": "Uma só estrela no centro, com todos os planetas em volta dela",
        "descricao": (
            "O arranjo mais simples e o mais fácil de colonizar: uma zona habitável "
            "só, órbitas estáveis e nenhuma segunda gravidade puxando os mundos."
        ),
        "estrelas": (1,),
        "peso": 55,
    },
    {
        "codigo": "binaria_estreita",
        "nome": "Binária estreita",
        "resumo": "Duas estrelas quase encostadas; os planetas orbitam o par inteiro",
        "descricao": (
            "As duas estrelas giram uma em torno da outra a menos de uma unidade "
            "astronômica. De longe elas somam luz como se fossem uma só, e os "
            "planetas descrevem órbitas circumbinárias em volta das duas. Céu com "
            "dois sóis que nunca se separam."
        ),
        "estrelas": (2,),
        "peso": 16,
    },
    {
        "codigo": "binaria_ampla",
        "nome": "Binária ampla",
        "resumo": "Duas estrelas distantes, cada uma com o seu próprio cortejo de mundos",
        "descricao": (
            "Separadas por dezenas ou centenas de unidades astronômicas, as duas "
            "estrelas mal interferem uma na outra: cada uma forma e mantém os "
            "próprios planetas. Na prática são dois sistemas que dividem um nome — e "
            "às vezes dois donos."
        ),
        "estrelas": (2,),
        "peso": 14,
    },
    {
        "codigo": "hierarquica",
        "nome": "Hierárquica",
        "resumo": "Uma primária dominante com companheiras menores orbitando-a",
        "descricao": (
            "Uma estrela concentra quase toda a massa e as companheiras giram em "
            "volta dela, longe o bastante para não desmontar as órbitas internas. Os "
            "mundos ficam com a primária; as companheiras aparecem como faróis "
            "distantes que atravessam o céu."
        ),
        "estrelas": (2, 3, 4),
        "peso": 12,
    },
    {
        "codigo": "trinaria",
        "nome": "Trinária em cortejo",
        "resumo": "Três estrelas dividindo o sistema, cada uma com seus mundos",
        "descricao": (
            "Três estrelas afastadas o suficiente para cada uma sustentar planetas "
            "próprios. Sistemas assim são valiosos — três zonas habitáveis num salto "
            "só — e por isso raramente ficam sem dono."
        ),
        "estrelas": (3, 4),
        "peso": 3,
    },
)

# --- Presets de geração de sistema -------------------------------------------
# Um preset descreve a vocação do sistema e enviesa a proposta aleatória para
# ficar coerente com ela: quais perfis de ocupação são plausíveis e quanto cada
# métrica sobe ou desce em relação ao patamar do perfil.
#
#   perfis    códigos de PERFIS (backend/modules/generator/gerador.py)
#   enfases   deslocamento aplicado à métrica, de -40 a +40

PRESETS_DE_SISTEMA = (
    {
        "codigo": "militar",
        "nome": "Bastião militar",
        "resumo": "Guarnição, estaleiro de guerra e lei marcial",
        "descricao": (
            "O sistema existe para sustentar uma frota. Ordem rígida e indústria "
            "pesada convivem com racionamento e vigilância: bom lugar para consertar "
            "uma nave, péssimo para fazer perguntas."
        ),
        "perfis": ("posto", "colonia", "povoado"),
        "enfases": {
            "industry": 18,
            "stability": 25,
            "information": 8,
            "quality_of_life": -22,
            "economy": -5,
        },
    },
    {
        "codigo": "industrial",
        "nome": "Polo industrial",
        "resumo": "Refinarias, estaleiros e céu permanentemente encoberto",
        "descricao": (
            "Tudo que se extrai na região é processado aqui. A produção sustenta a "
            "economia e destrói o ar: quem pode pagar mora em órbita."
        ),
        "perfis": ("colonia", "povoado", "central"),
        "enfases": {"industry": 28, "economy": 12, "quality_of_life": -20, "innovation": 5},
    },
    {
        "codigo": "capital",
        "nome": "Capital",
        "resumo": "Sede de poder, com tudo funcionando ao mesmo tempo",
        "descricao": (
            "Centro administrativo de uma potência. Bilhões de habitantes, capital "
            "farto, arquivos abertos e a polícia mais eficiente do braço."
        ),
        "perfis": ("central",),
        "enfases": {
            "economy": 20,
            "information": 22,
            "stability": 15,
            "innovation": 12,
            "quality_of_life": 10,
        },
    },
    {
        "codigo": "agricola",
        "nome": "Mundo agrícola",
        "resumo": "Celeiro de um aglomerado inteiro",
        "descricao": (
            "Clima estável e solo aproveitável fizeram do sistema a despensa da "
            "região. Vida boa e previsível, indústria mínima e dependência total de "
            "quem compra a colheita."
        ),
        "perfis": ("colonia", "povoado"),
        "enfases": {"quality_of_life": 20, "stability": 10, "industry": -22, "innovation": -12},
    },
    {
        "codigo": "minerador",
        "nome": "Distrito minerador",
        "resumo": "Cinturões explorados até o osso",
        "descricao": (
            "A riqueza está em órbita, não no chão. Turnos longos, acidentes "
            "frequentes e uma companhia que costuma ser dona da lei local."
        ),
        "perfis": ("posto", "colonia"),
        "enfases": {"industry": 20, "economy": 8, "quality_of_life": -25, "stability": -10},
    },
    {
        "codigo": "cientifico",
        "nome": "Enclave científico",
        "resumo": "Laboratórios, observatórios e muito segredo",
        "descricao": (
            "População pequena e altamente especializada em torno de instalações de "
            "pesquisa. Produz o que ninguém mais sabe fazer — e atrai quem quer isso "
            "sem pagar."
        ),
        "perfis": ("posto", "colonia"),
        "enfases": {"innovation": 30, "information": 18, "industry": -8, "economy": -5},
    },
    {
        "codigo": "comercial",
        "nome": "Entreposto comercial",
        "resumo": "Cruzamento de rotas onde tudo passa e tudo se compra",
        "descricao": (
            "Vive do trânsito: docas, armazéns, câmbio e notícia fresca. Rico e "
            "cosmopolita, com uma ordem pública que depende de quem está no porto."
        ),
        "perfis": ("colonia", "povoado", "central"),
        "enfases": {"economy": 25, "information": 15, "stability": -8},
    },
    {
        "codigo": "fronteira",
        "nome": "Posto de fronteira",
        "resumo": "O último lugar com nome antes do vazio",
        "descricao": (
            "Um punhado de gente, um pouso e um repetidor. Tudo o que chega vem de "
            "fora, e demora."
        ),
        "perfis": ("desabitado", "posto"),
        "enfases": {"information": -18, "economy": -10, "industry": -10},
    },
    {
        "codigo": "sem_lei",
        "nome": "Refúgio sem lei",
        "resumo": "Nenhuma autoridade reconhecida controla o sistema",
        "descricao": (
            "Contrabando, portos clandestinos e acordos que valem enquanto alguém "
            "puder fazê-los valer. Circula mais dinheiro do que se admite."
        ),
        "perfis": ("posto", "colonia", "povoado"),
        "enfases": {"stability": -32, "information": -12, "economy": 6, "quality_of_life": -12},
    },
    {
        "codigo": "ruina",
        "nome": "Sistema morto",
        "resumo": "Habitado um dia; hoje só o que ficou para trás",
        "descricao": (
            "Guerra, colapso ou evacuação. Restam estruturas, órbitas cheias de "
            "detritos e o que ninguém teve tempo de levar."
        ),
        "perfis": ("desabitado",),
        "enfases": {},
    },
)

# --- Níveis de região --------------------------------------------------------

NIVEIS_DE_REGIAO = (
    {
        "codigo": "supercluster",
        "nome": "Superaglomerado",
        "resumo": "A maior divisão do mapa",
        "descricao": "Agrupa aglomerados inteiros; serve de moldura geral do braço.",
    },
    {
        "codigo": "cluster",
        "nome": "Aglomerado",
        "resumo": "Divisão intermediária, com identidade política própria",
        "descricao": "Escala em que as potências pensam esferas de influência.",
    },
    {
        "codigo": "subcluster",
        "nome": "Subaglomerado",
        "resumo": "Vizinhança de alguns sistemas próximos",
        "descricao": "A escala do dia a dia: sistemas que se conhecem e comerciam entre si.",
    },
    {
        "codigo": "local",
        "nome": "Local",
        "resumo": "Recorte pequeno dentro de um subaglomerado",
        "descricao": "Útil para nomear uma fronteira disputada ou um punhado de sistemas.",
    },
)

# --- Tendências de influência ------------------------------------------------

TENDENCIAS = (
    {"codigo": "rising", "nome": "Em alta", "resumo": "A facção vem ganhando espaço"},
    {"codigo": "steady", "nome": "Estável", "resumo": "Situação sem mudança relevante"},
    {"codigo": "falling", "nome": "Em queda", "resumo": "A facção vem perdendo espaço"},
)

# --- Faixas de população -----------------------------------------------------

FAIXAS_DE_POPULACAO = (
    {"minimo": 0, "nome": "Desabitado", "resumo": "Sem presença humana permanente"},
    {"minimo": 1, "nome": "Posto avançado", "resumo": "Punhado de pessoas em rodízio"},
    {"minimo": 10_000, "nome": "Colônia", "resumo": "Assentamento autossuficiente"},
    {"minimo": 1_000_000, "nome": "Mundo povoado", "resumo": "Cidades e economia própria"},
    {"minimo": 1_000_000_000, "nome": "Mundo central", "resumo": "Bilhões de habitantes"},
    {"minimo": 10_000_000_000, "nome": "Metrópole estelar", "resumo": "Um dos centros do braço"},
)


def codigos(catalogo):
    """Tupla de códigos de um catálogo, para usar na validação."""
    return tuple(item["codigo"] for item in catalogo)


def por_codigo(catalogo, codigo):
    for item in catalogo:
        if item["codigo"] == codigo:
            return item
    return None


def faixa_da_metrica(metrica, valor):
    """Nome e descrição da faixa em que um valor cai (None se não há dado)."""
    if valor is None:
        return None
    for indice, (minimo, maximo) in enumerate(FAIXAS_PADRAO):
        if minimo <= valor <= maximo:
            return {
                "nome": NOMES_DE_FAIXA[indice],
                "descricao": metrica["faixas"][indice],
                "minimo": minimo,
                "maximo": maximo,
            }
    return None


def catalogo_completo():
    """Tudo que a interface precisa: dropdowns e glossário na mesma resposta."""
    return {
        "classes_de_estrela": list(CLASSES_DE_ESTRELA),
        "tipos_de_corpo": list(TIPOS_DE_CORPO),
        "metricas": [
            {
                **metrica,
                "faixas": [
                    {
                        "nome": NOMES_DE_FAIXA[indice],
                        "minimo": FAIXAS_PADRAO[indice][0],
                        "maximo": FAIXAS_PADRAO[indice][1],
                        "descricao": descricao,
                    }
                    for indice, descricao in enumerate(metrica["faixas"])
                ],
            }
            for metrica in METRICAS
        ],
        "tipos_de_rota": list(TIPOS_DE_ROTA),
        "arranjos_estelares": list(ARRANJOS_ESTELARES),
        "presets_de_sistema": list(PRESETS_DE_SISTEMA),
        "niveis_de_regiao": list(NIVEIS_DE_REGIAO),
        "tendencias": list(TENDENCIAS),
        "faixas_de_populacao": list(FAIXAS_DE_POPULACAO),
    }
