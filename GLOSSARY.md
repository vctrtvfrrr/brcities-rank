# BRCities Rank

App web público que ranqueia os municípios brasileiros pelas restrições e categorias que cada visitante configura.

## Language

**Restrição**:
Condição com um limite sobre o valor bruto de um critério, que tira do ranking a cidade que não a atinge, sem peso nem graduação.
_Avoid_: filtro

**Corte**:
A aplicação conjunta das restrições ligadas, sem ordem, que separa as Candidatas das cidades cortadas.

**Candidata**:
Cidade que passou no Corte.

**Ranking**:
A única lista ordenada das Candidatas, pelas categorias ligadas, sempre combinando todos os Avaliadores.
_Avoid_: Ranking objetivo, Ranking final

**Pontuação**:
Valor de 0 a 100 que ordena uma Candidata no Ranking, vindo das categorias que entram na conta dela; a Candidata em que nenhuma categoria entra na conta fica sem Pontuação, que não é Pontuação 0, e vai para o fim.
_Avoid_: nota final, score

**Sessão**:
Tudo o que o visitante configurou num navegador (restrições, subjetivas, avaliadores, pesos e notas), com um nome opcional; é o que se exporta e importa.
_Avoid_: configuração, perfil

**Toggle**:
Ligar ou desligar uma Restrição ou uma Categoria sem apagá-la; a categoria desligada sai da conta do Ranking, e nada se apaga.

**Avaliador**:
Pessoa da Sessão que tem os próprios Pesos e dá as próprias notas subjetivas; a Sessão tem sempre ao menos um, e o visitante é o primeiro.

**Avaliador ativo**:
O Avaliador cujas notas e pesos o visitante está editando no momento.

**Peso**:
Porcentagem de 0 a 100 que um avaliador dá a uma Categoria; os pesos de cada avaliador somam sempre 100.
_Avoid_: ordem de importância

**Dado ausente**:
Valor de um critério que a Coleta não obteve para uma cidade; nunca passa numa Restrição e vale nota 0 no critério.
_Avoid_: A conferir, sem dado
