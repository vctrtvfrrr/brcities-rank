import json
from datetime import datetime
from pathlib import Path

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "ibge-censo-criancas"
TITLE = "IBGE, Censo 2022, crianças de 0 a 14 anos"
TABLE = 9514
VARIABLE = 93
YEAR = 2022
API = f"https://servicodados.ibge.gov.br/api/v3/agregados/{TABLE}"
AGE_GROUPS = {"93070": "0 a 4 anos", "93084": "5 a 9 anos", "93085": "10 a 14 anos"}
ALL_SEXES = "2%5B6794%5D"
ALL_AGE_DECLARATIONS = "286%5B113635%5D"
PERIODS = RemoteFile("periodos.json", f"{API}/periodos")
CHILDREN = RemoteFile(
    "criancas-0-a-14.json",
    f"{API}/periodos/{YEAR}/variaveis/{VARIABLE}?localidades=N6%5Ball%5D"
    f"&classificacao=287%5B{','.join(AGE_GROUPS)}%5D%7C{ALL_SEXES}%7C{ALL_AGE_DECLARATIONS}",
)
FILES = (PERIODS, CHILDREN)
CHILDREN_COLUMN = "criancas_0_a_14"
COLUMNS = (CHILDREN_COLUMN,)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    response = json.loads((folder / CHILDREN.name).read_text(encoding="utf-8"))
    rows = {code: {CHILDREN_COLUMN: str(total)} for code, total in sum_age_groups(response).items()}
    return Extraction(COLUMNS, rows, edition=_edition(folder / PERIODS.name))


def sum_age_groups(response: list[dict]) -> dict[str, int]:
    """Adds the 0-4, 5-9 and 10-14 groups; a municipality missing any of them is left out."""
    totals: dict[str, int] = {}
    counted: dict[str, int] = {}
    groups = response[0]["resultados"]
    for group in groups:
        for entry in group["series"]:
            code = entry["localidade"]["id"]
            value = entry["serie"][str(YEAR)]
            if value.isdigit():
                totals[code] = totals.get(code, 0) + int(value)
                counted[code] = counted.get(code, 0) + 1
    return {code: total for code, total in totals.items() if counted[code] == len(groups)}


def _edition(periods_path: Path) -> str:
    period = next(
        period for period in json.loads(periods_path.read_text(encoding="utf-8")) if int(period["id"]) == YEAR
    )
    modified = datetime.strptime(period["modificacao"], "%d/%m/%Y").date().isoformat()
    return f"Tabela {TABLE} do SIDRA ({YEAR} atualizado em {modified})"
