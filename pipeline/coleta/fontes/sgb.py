import json
import urllib.parse
from collections.abc import Mapping
from datetime import UTC, date, datetime
from pathlib import Path

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "sgb"
TITLE = "SGB, Setorização de Áreas de Risco Geológico"
YEAR_LABEL = "2026"
LANDING_URL = "https://geoportal.sgb.gov.br/portal/apps/dashboards/c338199dee3a4d4bb0e43738b424a298"
CREDIT = "SGB-CPRM. Setorização de Áreas de Risco Geológico."
LAYER = "https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/risco/FeatureServer/0"
HIGH_RISK = ("Alto", "Muito alto")
SECTORS_FIELD = "setores"
LATEST_FIELD = "ultima_setorizacao"
QUERY = {
    "where": "grau_risco IN ({})".format(", ".join(f"'{grade}'" for grade in HIGH_RISK)),
    "outStatistics": json.dumps([
        {"statisticType": "count", "onStatisticField": "objectid", "outStatisticFieldName": SECTORS_FIELD},
        {"statisticType": "max", "onStatisticField": "data_setor", "outStatisticFieldName": LATEST_FIELD},
    ], separators=(",", ":")),
    "groupByFieldsForStatistics": "cd_geocmu",
    "orderByFields": "cd_geocmu",
    "f": "json",
}
SECTORS = RemoteFile("setores-risco-alto-por-municipio.json", f"{LAYER}/query?{urllib.parse.urlencode(QUERY)}")
FILES = (SECTORS,)
COLUMN = "setores_risco_sgb"


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    groups = sectors_by_municipality(json.loads((folder / SECTORS.name).read_text(encoding="utf-8")))
    rows = {code: {COLUMN: str(sectors)} for code, (sectors, _) in groups.items()}
    latest = max(latest for _, latest in groups.values())
    return Extraction((COLUMN,), rows, edition=f"Camada Setorização de Risco, setorizações até {latest.isoformat()}")


def sectors_by_municipality(response: dict) -> dict[str, tuple[int, date]]:
    if "error" in response or response.get("exceededTransferLimit"):
        raise SystemExit(f"{NAME}: a consulta ao serviço do SGB não veio completa; apague {SECTORS.name} e baixe de novo")
    return {
        entry["cd_geocmu"]: (entry[SECTORS_FIELD], datetime.fromtimestamp(entry[LATEST_FIELD] / 1000, UTC).date())
        for entry in (feature["attributes"] for feature in response["features"])
    }


def derive(row: Mapping[str, str]) -> dict[str, str]:
    """A municipality outside the layer has no high-risk sector mapped, which is not the same as having no risk."""
    return {COLUMN: row.get(COLUMN) or "0"}
