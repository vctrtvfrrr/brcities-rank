# BRCities Rank

BRCities Rank é um app web que faz uma filtragem e gera um ranking a partir de todos os municípios brasileiros levando em consideração os critérios que você utilizar.

O app passa as todas as cidades brasileiras por um funil de três fases:

1. **Restrições e Corte:** limites sobre dados públicos (população, clima, segurança, saúde, acesso a internet, etc.) tiram da lista as cidades que não atendem aos critérios.
2. **Categorias objetivas:** as cidades recebem, automaticamente, notas em Segurança, Desastres Naturais, Saúde, Educação, Clima e Porte, com pesos definidos pela ordem de importância de cada avaliador.
3. **Categorias subjetivas:** cada avaliador cadastra os próprios temas e dá notas às cidades que marcar, o que gera o ranking final.

O resultado aparece num mapa do Brasil, com a lista ordenada ao lado. Toda a configuração fica no navegador e pode ser exportada ou compartilhada por link. O app utiliza um dataset montado a partir de fontes públicas (IBGE, DataSUS, INEP, Anatel e outras).

## Licença

[MIT](LICENSE)
