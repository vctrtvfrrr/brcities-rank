import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "ibge-censo-esgoto"
TITLE = "IBGE, Censo Demográfico 2022"
YEAR_LABEL = "2022"
LANDING_URL = "https://sidra.ibge.gov.br/tabela/7555"
CREDIT = "IBGE. Censo Demográfico 2022, tabela 7555 do SIDRA."
TABLE = 7555
YEAR = 2022
RESIDENTS = 382
API = f"https://servicodados.ibge.gov.br/api/v3/agregados/{TABLE}"

SEWAGE_CLASSIFICATION = "11558"
TOTAL = "46292"
NETWORK = "46290"
SEPTIC_TANK = "72112"
ALL_AGES = "58[95253]"
ALL_RACES = "86[95251]"
QUERY = urlencode({
    "localidades": "N6[all]",
    "classificacao": f"{SEWAGE_CLASSIFICATION}[{TOTAL},{NETWORK},{SEPTIC_TANK}]|{ALL_AGES}|{ALL_RACES}",
})

PERIODS = RemoteFile("periodos.json", f"{API}/periodos")
SEWAGE = RemoteFile("moradores-por-esgotamento.json", f"{API}/periodos/{YEAR}/variaveis/{RESIDENTS}?{QUERY}")
FILES = (PERIODS, SEWAGE)
COLUMN = "esgoto_pct"
COLUMNS = (COLUMN,)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    response = json.loads((folder / SEWAGE.name).read_text(encoding="utf-8"))
    return Extraction(COLUMNS, sewage_shares(response), edition=_edition(folder / PERIODS.name))


def sewage_shares(response: list[dict]) -> dict[str, dict[str, str]]:
    """Share of residents served by the general network (or a septic tank tied to it) or by a standalone septic tank."""
    residents = {_category(result): _counts(result) for result in response[0]["resultados"]}
    rows = {}
    for code, total in residents[TOTAL].items():
        served = [residents[category].get(code) for category in (NETWORK, SEPTIC_TANK)]
        if total and all(count is not None for count in served):
            rows[code] = {COLUMN: f"{sum(served) / total * 100:.2f}"}
    return rows


def _category(result: dict) -> str:
    sewage = next(c for c in result["classificacoes"] if c["id"] == SEWAGE_CLASSIFICATION)
    return next(iter(sewage["categoria"]))


def _counts(result: dict) -> dict[str, int | None]:
    """Counts by municipality; SIDRA writes '-' for zero and other symbols for suppressed values."""
    counts = {}
    for entry in result["series"]:
        value = next(iter(entry["serie"].values()))
        counts[entry["localidade"]["id"]] = 0 if value == "-" else int(value) if value.isdigit() else None
    return counts


def _edition(periods_path: Path) -> str:
    period = next(p for p in json.loads(periods_path.read_text(encoding="utf-8")) if p["id"] == str(YEAR))
    modified = datetime.strptime(period["modificacao"], "%d/%m/%Y").date().isoformat()
    return f"Tabela {TABLE} do SIDRA (Censo {YEAR}, atualizado em {modified})"
