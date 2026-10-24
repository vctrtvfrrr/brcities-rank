# Peso de 0 a 10, sem soma fixa, normalizado por avaliador

Até aqui cada avaliador distribuía 100% entre as categorias, e mexer num slider redistribuía os demais na proporção atual. O Peso passa a ser um inteiro de 0 a 10 por categoria, independente dos outros: mover um slider não mexe em nenhum outro. O Ranking converte os Pesos de cada avaliador em Participações (Peso ÷ soma dos Pesos nas categorias ligadas) e tira a média das Participações entre os avaliadores, de modo que quem dá 10 em tudo não pesa mais do que quem dá 2 em tudo. O avaliador com Peso 0 em todas as ligadas fica fora da média; se todos estiverem assim, nenhuma categoria entra na conta e as Candidatas ficam sem Pontuação.

A interface mostra só o número do Peso, sem porcentagem e sem "pts" (para não colidir com Pontuação). A linha "média da Sessão" mostra a média dos Pesos dos avaliadores. "Igualar pesos" volta todas as categorias do avaliador ativo a 5. As objetivas nascem com 5 e a subjetiva nova com 0, para que criá-la não mude o Ranking. Um avaliador novo nasce com 5 em todas as categorias, subjetivas inclusive, como depois de "Igualar pesos".

## Considered Options

- **Manter a soma de 100 com sliders acoplados:** exato, mas mexer numa categoria muda as outras, o que confunde mais do que ajuda.
- **Média dos Pesos brutos entre avaliadores:** mais simples, mas o avaliador generoso nos números domina a combinação.
- **Normalizar sobre todas as categorias, ligadas ou não:** quem pôs Peso em categorias desligadas perderia influência no Ranking atual sem ter mudado nada que conta.

## Consequences

- O formato da Sessão muda de versão. Sessões antigas (arquivo, Link da Sessão e navegador) são convertidas ao carregar: a maior porcentagem de cada avaliador vira 10 e as demais escalam junto, arredondadas, e nenhuma porcentagem acima de 0 vira 0. Links já compartilhados continuam abrindo, com perda de precisão.
- A importação passa a recusar Peso fora de 0 a 10 ou não inteiro, e deixa de exigir soma 100.
- Apagar uma subjetiva não redistribui mais nada: o Peso dela só sai.
