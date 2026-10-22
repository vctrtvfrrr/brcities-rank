# Pipeline da Coleta

Levanta os dados dos 5.570 municípios nas fontes públicas descritas em [metodologia-dos-dados.md](../docs/metodologia-dos-dados.md) e escreve o registro versionado:

- `dados/municipios.csv`: um município por linha, com os valores das restrições de referência, o motivo do corte ou as marcas A conferir, e os valores dos critérios.
- `corte.md`: quantas cidades cada restrição de referência cortou e quais Candidatas passaram com marca.
- `criterios.md`: fonte, recorte, edição, endereço e P5/P95 de cada critério.

Os arquivos baixados ficam em `fontes/`, fora do Git: são grandes e reproduzíveis, e `criterios.md` guarda o bastante para baixá-los de novo.

## Uso

Requer [uv](https://docs.astral.sh/uv/).

```bash
uv run python -m coleta baixar
```

```bash
uv run python -m coleta extrair
```

```bash
uv run python -m coleta montar
```

```bash
uv run python -m coleta validar
```

`baixar` e `extrair` aceitam nomes de fonte para rodar só parte delas. Algumas fontes não têm link direto: `baixar` lista o caminho e o endereço de cada arquivo de download manual. `validar` confronta a Coleta com fontes de referência e escreve `fontes/validacao.md`, fora do Git.

## Testes

```bash
uv run pytest
```
