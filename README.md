# BRCities Rank

[![app](https://github.com/vctrtvfrrr/brcities-rank/actions/workflows/app.yml/badge.svg)](https://github.com/vctrtvfrrr/brcities-rank/actions/workflows/app.yml) [![pipeline](https://github.com/vctrtvfrrr/brcities-rank/actions/workflows/pipeline.yml/badge.svg)](https://github.com/vctrtvfrrr/brcities-rank/actions/workflows/pipeline.yml)

BRCities Rank é um app web que filtra todos os municípios brasileiros pelas restrições que você exige e ordena os que sobram pelas categorias que importam para você.

- **Restrições** (população, clima, segurança, hospital, acesso à internet, altitude, declividade urbana, classe de relevo e outras) cortam as cidades que não atendem ao que você exige.
- **Categorias objetivas** (Segurança, Desastres, Saúde, Escola, Clima e Porte) dão notas automáticas às cidades que sobraram, a partir de dados públicos.
- **Categorias subjetivas** são temas seus, como lazer ou paisagem, em que você mesmo dá a nota.

Cada avaliador (uma família pode ter vários) dá os próprios pesos e notas, e o ranking combina todos. O resultado aparece num mapa do Brasil, com a tabela ordenada embaixo. O navegador guarda várias Sessões, distinguidas pelo nome, e cada uma pode ser exportada e importada como arquivo ou compartilhada por link. O app usa um dataset montado a partir de fontes públicas (IBGE, DataSUS, INEP, Anatel e outras) pelo [pipeline da Coleta](pipeline/README.md).

## Licença

[MIT](LICENSE)
