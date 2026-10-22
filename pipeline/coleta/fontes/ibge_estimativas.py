import json
from datetime import datetime
from pathlib import Path

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "ibge-estimativas"
TITLE = "IBGE, Estimativas da População"
YEAR_LABEL = "2024 e 2026"
LANDING_URL = "https://sidra.ibge.gov.br/tabela/6579"
CREDIT = "IBGE. Estimativas da População, tabela 6579 do SIDRA."
TABLE = 6579
VARIABLE = 9324
API = f"https://servicodados.ibge.gov.br/api/v3/agregados/{TABLE}"
YEARS = (2024, 2026)
PERIODS = RemoteFile("periodos.json", f"{API}/periodos")


def population_file(year: int) -> RemoteFile:
    return RemoteFile(
        f"populacao-{year}.json",
        f"{API}/periodos/{year}/variaveis/{VARIABLE}?localidades=N6%5Ball%5D",
    )


def population_column(year: int) -> str:
    return f"populacao_{year}"


FILES = (PERIODS, *(population_file(year) for year in YEARS))
COLUMNS = tuple(population_column(year) for year in YEARS)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    rows: dict[str, dict[str, str]] = {}
    for year in YEARS:
        for code, value in _series(folder / population_file(year).name):
            if value.isdigit():
                rows.setdefault(code, {})[population_column(year)] = value
    return Extraction(COLUMNS, rows, edition=_edition(folder / PERIODS.name))


def _series(path: Path) -> list[tuple[str, str]]:
    response = json.loads(path.read_text(encoding="utf-8"))
    return [
        (entry["localidade"]["id"], next(iter(entry["serie"].values())))
        for entry in response[0]["resultados"][0]["series"]
    ]


def _edition(periods_path: Path) -> str:
    modified = {
        int(period["id"]): datetime.strptime(period["modificacao"], "%d/%m/%Y").date().isoformat()
        for period in json.loads(periods_path.read_text(encoding="utf-8"))
    }
    updates = ", ".join(f"{year} atualizado em {modified[year]}" for year in YEARS)
    return f"Tabela {TABLE} do SIDRA ({updates})"
