# BRCities Rank

App web público que ranqueia os municípios brasileiros pelas restrições e categorias que cada visitante configura.

## Language

**Restrição**:
Condição com um limite, sobre o valor bruto de um critério ou sobre a Pontuação, que tira do ranking a cidade que não a atinge, sem peso nem graduação.
_Avoid_: filtro

**Pontuação mínima**:
Restrição que tira do ranking a cidade com Pontuação abaixo de um valor de 0 a 100; nasce sem valor, sem cortar ninguém, e deixa passar a cidade sem Pontuação. Mexer em Pesos, notas subjetivas ou categorias ligadas pode tirar ou devolver cidades por ela. A cidade cortada por ela mostra no detalhe a Pontuação e as notas que a deixaram de fora.
_Avoid_: filtro por pontuação, nota de corte

**Localização**:
Restrição que aceita um conjunto de estados (UFs) e tira do ranking a cidade cujo estado não está nele; nasce com todos os estados aceitos e pode ficar sem nenhum, quando corta todas as cidades.
_Avoid_: filtro por região, filtro por estado

**Tensão**:
Restrição que aceita 127 V, 220 V ou as duas, pela tensão da tomada comum (fase-neutro) da rede de distribuição do município, com as tensões raras contadas na mais próxima das duas; a cidade com mais de uma tensão passa se alguma delas for aceita. Nasce com as duas aceitas, mas, como todo Dado ausente, a cidade sem tensão conhecida não passa. Nunca entra na Pontuação; no Detalhe aparece como a ANEEL a publica, no par fase-fase/fase-neutro (ex.: 230/115 V).
_Avoid_: voltagem

**Região**:
Uma das cinco grandes regiões do IBGE (Norte, Nordeste, Centro-Oeste, Sudeste e Sul), cada uma um grupo fixo de estados; na Localização é só um atalho que aceita ou recusa todos os estados dela, e não se guarda na Sessão.

**Altitude**:
Restrição sobre a altura do terreno, em metros acima do nível do mar, no ponto da sede do município; nasce sem limites e nunca entra na Pontuação.
_Avoid_: relevo, elevação

**Declividade urbana**:
Restrição sobre a declividade média do terreno, em %, nos setores urbanos do distrito-sede: o quanto as ruas da cidade sobem e descem. Nasce sem limites e nunca entra na Pontuação.
_Avoid_: relevo, inclinação

**Classe de relevo**:
Restrição que aceita um conjunto de classes da Embrapa (plano, suave ondulado, ondulado, forte ondulado, montanhoso, escarpado) e tira do ranking a cidade cuja classe não está nele. A classe é a que cobre a maior área do território do município, e não só da sede; no empate, vale a mais plana. Nasce com todas as classes aceitas, pode ficar sem nenhuma e nunca entra na Pontuação.
_Avoid_: relevo, topografia

**Corte**:
A aplicação conjunta das restrições ligadas, sem ordem, que separa as Candidatas das cidades cortadas.

**Candidata**:
Cidade que passou no Corte.

**Ranking**:
A única lista ordenada das Candidatas, pelas categorias ligadas, sempre combinando todos os Avaliadores.
_Avoid_: Ranking objetivo, Ranking final

**Critério**:
Medida de uma Categoria objetiva, tirada de uma fonte pública, com uma direção (maior ou menor é melhor); vira nota de 0 a 100 pela posição do valor da cidade na Régua.

**Régua**:
Intervalo de um Critério entre a ponta ruim, que vale nota 0, e a ponta boa, que vale 100, com nota linear no meio e presa a 0 e 100 fora dele. Cada ponta é o limite da Restrição ligada naquele lado, ou, sem ele, o 5º ou 95º percentil do Critério entre todos os municípios do Brasil; quando esse percentil fica do lado errado do limite, a ponta vai ao extremo real do dado. Não depende das outras Candidatas, e a Candidata exatamente no limite ruim passa no Corte com nota 0; se as duas pontas coincidem, todas valem 100.
_Avoid_: alvo, meta, critério selecionado

**Pontuação**:
Valor de 0 a 100 que ordena uma Candidata no Ranking, vindo das categorias que entram na conta dela; a Candidata em que nenhuma categoria entra na conta fica sem Pontuação, que não é Pontuação 0, e vai para o fim.
_Avoid_: nota final, score

**Faixa**:
Uma das quatro partes da escala de 0 a 100 em que cai a Pontuação ou a nota de uma categoria: baixa (abaixo de 40, vermelho), média (40 a 60, laranja), alta (60 a 80, verde) e muito alta (80 ou mais, azul). Como as notas dos Critérios vêm da Régua, a Faixa diz onde a cidade fica entre o que o visitante tolera e o melhor do Brasil, e não muda quando outras cidades entram ou saem do Corte.

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

**Nota subjetiva**:
Inteiro de 1 a 5 que um Avaliador dá a uma cidade numa Categoria subjetiva; dar de novo a mesma nota a retira. Só se dá no Detalhe; o Ranking apenas a mostra.
_Avoid_: voto, votação

**Detalhe**:
Vista de uma única cidade, Candidata ou cortada, com a Pontuação, a nota de cada categoria e as Notas subjetivas de cada Avaliador; é o único lugar onde o Avaliador ativo dá Nota subjetiva.
_Avoid_: aba, gaveta, drawer

**Peso**:
Inteiro de 0 a 10 que um avaliador dá a uma Categoria, independente dos pesos que ele dá às demais; o que conta no Ranking é a Participação que ele gera. Peso 0 tira a categoria da conta daquele avaliador. As objetivas nascem com 5 e a subjetiva nova com 0.
_Avoid_: porcentagem, pontos (colide com Pontuação), ordem de importância

**Participação**:
Fração do Peso de uma categoria ligada sobre a soma dos Pesos que o avaliador dá às categorias ligadas. O Ranking usa a média das Participações dos avaliadores; o avaliador cujos Pesos nas ligadas são todos 0 fica fora dessa média.

**Dado ausente**:
Valor de um critério que a Coleta não obteve para uma cidade; nunca passa numa Restrição e vale nota 0 no critério.
_Avoid_: A conferir, sem dado
