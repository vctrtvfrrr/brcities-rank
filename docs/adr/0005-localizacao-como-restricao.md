# Localização é uma Restrição

Recortar por região ou estado entra no app como mais uma Restrição, a Localização, que aceita um conjunto de estados. Como toda Restrição, ela participa do Corte: as cidades fora dos estados aceitos são cortadas, e as posições passam a contar só as Candidatas de dentro. Quem recorta "Sul" vê o Sul em ordem, de 1 em diante, sem a posição nacional de cada cidade. As notas não mudam com o recorte, porque vêm da Régua de cada Critério (ADR 0006). Escolhemos assim porque o modelo já tem um único mecanismo para tirar cidades do Ranking, a Sessão já o guarda e compartilha, e um segundo mecanismo de exclusão confundiria o que é Candidata.

## Considered Options

- **Filtro de exibição fora do Corte:** só esconderia linhas da tabela e do mapa, mantendo posição e Pontuação nacionais ("Curitiba é a 12ª do Brasil"). Rejeitado por criar um conceito novo de cidade escondida, ao lado de cortada, e posições com buracos.
- **Duas Restrições, Região e Estado:** como o Corte exige todas as Restrições, "Sul" e "SP" juntos cortariam tudo. Ficou uma Restrição só, por estados, com as regiões como atalhos.

## Consequences

- O formato da Sessão ganha mais um tipo de Restrição; a Sessão guarda só os estados aceitos, nunca as regiões.
- Ligar ou mudar a Localização muda as posições, mas não as notas: a Localização não tem limite numérico e não entra em nenhuma Régua.
