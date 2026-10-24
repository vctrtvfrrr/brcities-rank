# Pontuação mínima é uma Restrição

O visitante quer tirar do Ranking as cidades com Pontuação baixa. Isso entra como mais uma Restrição, a Pontuação mínima, que participa do Corte como as outras: quem fica abaixo do valor é cortado, com o motivo registrado, e as posições contam só quem sobra. Até o ADR 0006 isso seria circular, porque as notas dependiam das Candidatas e cortar mudaria as notas de quem ficou. Com a Régua, a Pontuação de uma cidade só depende dos dados dela, das Restrições numéricas, dos Pesos e das notas subjetivas, então o Corte continua sendo a aplicação conjunta das Restrições, sem ordem.

## Considered Options

- **Filtro só de exibição:** esconderia linhas e marcadores sem mexer no Corte, mantendo as posições originais com buracos. Rejeitado pelo mesmo motivo do ADR 0005: criaria a cidade escondida ao lado da cortada.
- **Limite também nas notas de categoria (ex.: Segurança ≥ 60):** mais poder, mas mais estado na Sessão sem pedido concreto; ficou só a Pontuação.
- **Cortar a cidade sem Pontuação:** contradiria o glossário, em que sem Pontuação não é Pontuação 0, e esvaziaria a lista quando tudo está desligado.

## Consequences

- O Corte passa a depender dos Pesos, das notas subjetivas e das categorias ligadas: mexer neles pode tirar ou devolver cidades.
- A Pontuação passa a ser calculada para todas as cidades, não só para as Candidatas, para que a cidade cortada mostre por quanto ficou de fora.
- O formato da Sessão ganha mais um tipo de Restrição, só com mínimo; nasce sem valor e não corta nada até o visitante escolher.
