# Referência da Régua: Candidatas por padrão, Brasil como opção

O ADR 0006 tirou as Candidatas da nota: sem limite de Restrição, as pontas da Régua passaram a ser o P5 e o P95 do Brasil. Com isso, numa Sessão com Restrições largas, a nota diz quão boa a cidade é no país, mas separa pouco as Candidatas entre si. A Sessão ganha a Referência, que escolhe de onde saem as pontas sem limite: Candidatas, o padrão, ou Brasil, o comportamento do ADR 0006. Os limites das Restrições ligadas continuam sendo as pontas, nas duas Referências, então a Candidata no limite ruim segue valendo 0.

Para não voltar à circularidade que o ADR 0007 evitava, o grupo da Referência Candidatas é o das cidades que passam em todas as Restrições ligadas menos a Pontuação mínima. A Régua não depende da Pontuação, a Pontuação mínima corta por ela, e o Corte continua sendo a aplicação conjunta das Restrições, sem ordem.

## Considered Options

- **Min-max puro das Candidatas, como antes do ADR 0006:** espalha mais as notas, mas ignora os limites, e o limite deixa de ser "o que o visitante tolera".
- **Desativar a Pontuação mínima na Referência Candidatas:** evita a circularidade, mas tira uma Restrição justo do modo padrão.
- **Pontuação mínima sempre pela Régua do Brasil:** a mesma cidade teria duas Pontuações, uma para cortar e outra para ordenar.
- **Preferência do navegador, fora da Sessão:** o mesmo Link da Sessão daria Rankings diferentes.

## Consequences

- A Sessão ganha a Referência; Sessões e links sem ela abrem com Candidatas, então as notas, as Faixas e as posições delas mudam.
- Na Referência Candidatas, a nota de uma cidade muda quando outras entram ou saem do grupo, e mexer em qualquer Restrição, menos a Pontuação mínima e a Avaliação subjetiva, pode mudar a Régua.
- Num Critério sem valor em nenhuma cidade do grupo, a Régua usa o Brasil, em vez de zerar todo mundo.
- A cidade cortada é medida pela mesma Régua das Candidatas.
- O toggle fica junto das categorias e dos Pesos, porque muda as notas, não o Corte.

> A Avaliação subjetiva, que veio depois, também fica fora do grupo da Referência Candidatas: dar ou tirar uma nota subjetiva nunca muda a Régua, só decide se a cidade passa no Corte.
