import json
from datetime import datetime
from pathlib import Path

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "ibge-censo-populacao"
TITLE = "IBGE, Censo Demográfico 2022: população residente"
TABLE = 4709
VARIABLE = 93
YEAR = 2022
API = f"https://servicodados.ibge.gov.br/api/v3/agregados/{TABLE}"
PERIODS = RemoteFile("periodos.json", f"{API}/periodos")
POPULATION = RemoteFile(
    f"populacao-{YEAR}.json",
    f"{API}/periodos/{YEAR}/variaveis/{VARIABLE}?localidades=N6%5Ball%5D",
)
FILES = (PERIODS, POPULATION)
COLUMN = f"populacao_{YEAR}"


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    response = json.loads((folder / POPULATION.name).read_text(encoding="utf-8"))
    rows = {
        entry["localidade"]["id"]: {COLUMN: value}
        for entry in response[0]["resultados"][0]["series"]
        if (value := entry["serie"][str(YEAR)]).isdigit()
    }
    return Extraction((COLUMN,), rows, edition=_edition(folder / PERIODS.name))


def _edition(periods_path: Path) -> str:
    period = next(p for p in json.loads(periods_path.read_text(encoding="utf-8")) if p["id"] == str(YEAR))
    modified = datetime.strptime(period["modificacao"], "%d/%m/%Y").date().isoformat()
    return f"Tabela {TABLE} do SIDRA ({YEAR} atualizado em {modified})"
