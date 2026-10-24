# Nota do Critério pela Régua das Restrições, não pelas Candidatas

Até aqui a nota de cada Critério era um min-max aparado no P5 e no P95 das Candidatas do Corte: a melhor Candidata valia perto de 100 e a pior perto de 0, fosse qual fosse o valor delas. Uma cidade mudava de nota quando outras entravam ou saíam do Corte, e a nota não dizia nada sobre o que o visitante queria. Agora cada Critério tem uma Régua com uma ponta ruim (nota 0) e uma ponta boa (nota 100), linear no meio. Cada ponta é o limite da Restrição ligada naquele lado; sem limite, é o P5 ou o P95 do Critério entre todos os municípios do Brasil, e, se esse percentil cair do lado errado do limite, o extremo real do dado. Com Homicídios ≤ 20, a cidade com 20 vale 0 e a nota sobe ao se afastar dele; com População ≤ 150 mil, quem tem 150 mil vale 100 e a nota cai ao se afastar dele. As Restrições continuam cortando, e passam também a dar as pontas da Régua: o visitante diz o que tolera, e a nota mede quanto a cidade se afasta disso no sentido bom.

## Considered Options

- **Alvo por Critério, separado das Restrições:** um valor ideal por Critério, com a nota caindo pela distância até ele. Daria controle independente do Corte, mas duplicaria o que a Restrição já diz e criaria um estado novo na Sessão.
- **Distância ao limite escalada pelas Candidatas:** manteria a nota relativa ao Corte, que é justamente o que se quis abandonar.
- **Restrição desligada como ponta da Régua:** permitiria graduar sem cortar, mas faria o Toggle ter dois efeitos diferentes; ficou valendo só a ligada, como no Corte.

## Consequences

- A Sessão não muda de formato: as Restrições já guardam os limites. Sessões e links antigos abrem iguais, mas as notas, as Faixas e as posições mudam.
- A Candidata exatamente no limite ruim passa no Corte com nota 0 naquele Critério.
- A Localização, o Köppen, o hospital e a fibra não têm limite numérico em Critério que pontua, então não mexem em nenhuma Régua.
- A População continua em logaritmo, agora na Régua.
- O [`criterios.md`](../../pipeline/criterios.md) da Coleta segue com o min-max sobre o Corte de referência, que é um artefato à parte do app.
