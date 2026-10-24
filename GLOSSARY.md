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

**Faixa**:
Uma das quatro partes da escala de 0 a 100 em que cai a Pontuação ou a nota de uma categoria: baixa (abaixo de 40, vermelho), média (40 a 60, laranja), alta (60 a 80, verde) e muito alta (80 ou mais, azul). Como as notas são relativas, a Faixa diz como a cidade se sai entre as Candidatas do Corte atual.

**Dez primeiras**:
As Candidatas nas posições 1 a 10 do Ranking; só existem quando alguma Candidata tem Pontuação, e são menos de dez quando menos Candidatas a têm.
_Avoid_: top 10, destaque

**Sessão**:
Tudo o que o visitante configurou (restrições, subjetivas, avaliadores, pesos e notas), com um nome; é o que se exporta, importa e compartilha por link. O navegador guarda várias, e o nome é o que distingue uma da outra: não há duas Sessões com o mesmo nome no mesmo navegador.
_Avoid_: configuração, perfil

**Sessão ativa**:
A Sessão que o visitante está vendo e editando no momento, entre as que o navegador guarda.

**Link da Sessão**:
Endereço do app que leva uma cópia da Sessão inteira; quem o abre recebe a Sessão como numa importação: se já tiver uma com o mesmo nome, o app pergunta antes de substituí-la, e senão ela entra ao lado das outras.

**Toggle**:
Ligar ou desligar uma Restrição ou uma Categoria sem apagá-la; a categoria desligada sai da conta do Ranking, e nada se apaga.
_Avoid_: toggle para recolher ou expandir uma seção do painel, que é só apresentação e não muda o Ranking

**Avaliador**:
Pessoa da Sessão que tem os próprios Pesos e dá as próprias notas subjetivas; a Sessão tem sempre ao menos um, e o visitante é o primeiro.

**Avaliador ativo**:
O Avaliador cujas notas e pesos o visitante está editando no momento.

**Peso**:
Inteiro de 0 a 10 que um avaliador dá a uma Categoria, independente dos pesos que ele dá às demais; o que conta no Ranking é a Participação que ele gera. Peso 0 tira a categoria da conta daquele avaliador. As objetivas nascem com 5 e a subjetiva nova com 0.
_Avoid_: porcentagem, pontos (colide com Pontuação), ordem de importância

**Participação**:
Fração do Peso de uma categoria ligada sobre a soma dos Pesos que o avaliador dá às categorias ligadas. O Ranking usa a média das Participações dos avaliadores; o avaliador cujos Pesos nas ligadas são todos 0 fica fora dessa média.

**Dado ausente**:
Valor de um critério que a Coleta não obteve para uma cidade; nunca passa numa Restrição e vale nota 0 no critério.
_Avoid_: A conferir, sem dado
