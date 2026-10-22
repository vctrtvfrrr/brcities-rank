import io
import zipfile
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

import openpyxl

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "inep-ideb"
TITLE = "INEP, IDEB"
YEAR = 2025
RESULTS = "https://download.inep.gov.br/ideb/resultados"
PUBLIC_NETWORK = "Pública"
CODE_HEADER = "CO_MUNICIPIO"
NETWORK_HEADER = "REDE"
SCORE_HEADER = f"VL_OBSERVADO_{YEAR}"


@dataclass(frozen=True)
class Stage:
    slug: str
    column: str

    @property
    def file(self) -> RemoteFile:
        name = f"divulgacao_{self.slug}_municipios_{YEAR}.zip"
        return RemoteFile(name, f"{RESULTS}/{name}")


EARLY_YEARS = Stage("anos_iniciais", "ideb_anos_iniciais")
LATE_YEARS = Stage("anos_finais", "ideb_anos_finais")
HIGH_SCHOOL = Stage("ensino_medio", "ideb_ensino_medio")
STAGES = (EARLY_YEARS, LATE_YEARS, HIGH_SCHOOL)
FILES = tuple(stage.file for stage in STAGES)
COLUMNS = tuple(stage.column for stage in STAGES)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    rows: dict[str, dict[str, str]] = {}
    for stage in STAGES:
        for code, score in public_scores(_sheet_rows(folder / stage.file.name)).items():
            rows.setdefault(code, {})[stage.column] = score
    return Extraction(COLUMNS, rows, edition=f"IDEB {YEAR}, resultados por município, rede pública")


def public_scores(sheet: Iterable[Sequence]) -> dict[str, str]:
    """IDEB of the public network per municipality; '-' (too few SAEB participants) is left out."""
    rows = iter(sheet)
    header = next(row for row in rows if CODE_HEADER in row)
    code, network, score = (header.index(name) for name in (CODE_HEADER, NETWORK_HEADER, SCORE_HEADER))
    return {
        str(row[code]): f"{row[score]:.1f}"
        for row in rows
        if len(row) > score and row[network] == PUBLIC_NETWORK and isinstance(row[score], int | float)
    }


def _sheet_rows(archive_path: Path) -> list[tuple]:
    with zipfile.ZipFile(archive_path) as archive:
        workbook_name = next(name for name in archive.namelist() if name.endswith(".xlsx"))
        workbook = openpyxl.load_workbook(io.BytesIO(archive.read(workbook_name)), read_only=True)
    try:
        return list(workbook.worksheets[0].iter_rows(values_only=True))
    finally:
        workbook.close()
