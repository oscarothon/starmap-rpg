-- A rota padrão passa a se chamar Hyperlane.
--
-- O nome "corda cósmica" era um empréstimo da física que não pegou na mesa:
-- o termo usado na campanha é hyperlane. Como o código do tipo aparece na
-- interface (classe CSS) e no catálogo, ele acompanha o nome em vez de ficar
-- descolado dele.
--
-- A coluna `bidirectional` deixa de ser lida ou escrita pela aplicação: uma
-- rota liga dois sistemas nos dois sentidos, sempre. A coluna fica no banco
-- como legado (removê-la exigiria recriar a tabela central, o que este projeto
-- evita) e o DEFAULT 1 continua valendo para quem inserir por SQL direto.
--
-- Mesmo caso do DEFAULT 'cosmic_string' de lane_type: ele vira legado morto.
-- Nenhum caminho da aplicação insere uma rota sem lane_type — o parser sempre
-- preenche o campo, com 'hyperlane' como padrão.

UPDATE lane SET lane_type = 'hyperlane' WHERE lane_type = 'cosmic_string';
