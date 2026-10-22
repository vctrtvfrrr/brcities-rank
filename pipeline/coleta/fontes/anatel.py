import csv
import io
import re
import zipfile
from collections.abc import Iterator
from pathlib import Path

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "anatel"
TITLE = "Anatel, acessos de banda larga fixa"
YEAR_LABEL = "2025 e 2026"
LANDING_URL = "https://informacoes.anatel.gov.br/paineis/acessos/banda-larga-fixa"
CREDIT = "Anatel. Acessos de banda larga fixa, dados abertos."
ARCHIVE = RemoteFile(
    "acessos_banda_larga_fixa.zip",
    "https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/acessos_banda_larga_fixa.zip",
)
FILES = (ARCHIVE,)

COLUMN = "fibra"
YES = "sim"
NO = "não"
WINDOW_MONTHS = 12

# The archive has each period twice: one row per month (Ano;Mês;Acessos) and,
# far smaller, the *_Colunas.csv tables with one column per month (YYYY-MM).
MONTHLY_TABLE = "_Colunas.csv"
MONTH = re.compile(r"\d{4}-\d{2}")
CODE = "Código IBGE Município"
# The Tecnologia labels contradict the medium in some declarations (FTTH over
# radio, ADSL2 over fiber); the access medium is the field that names fiber.
MEDIUM = "Meio de Acesso"
FIBER = "Fibra"


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    with zipfile.ZipFile(folder / ARCHIVE.name) as archive:
        tables = [name for name in archive.namelist() if name.endswith(MONTHLY_TABLE)]
        months = {name: _months(_header(archive, name)) for name in tables}
        window = sorted({month for table_months in months.values() for month in table_months})[-WINDOW_MONTHS:]
        fiber: dict[str, bool] = {}
        for name in tables:
            if set(months[name]) & set(window):
                for code, medium in _accesses(archive, name, window):
                    fiber[code] = fiber.get(code, False) or medium == FIBER
    rows = {code: {COLUMN: YES if has_fiber else NO} for code, has_fiber in fiber.items()}
    return Extraction((COLUMN,), rows, edition=f"Os {WINDOW_MONTHS} meses mais recentes do arquivo, de {window[0]} a {window[-1]}")


def _header(archive: zipfile.ZipFile, name: str) -> list[str]:
    with archive.open(name) as table:
        return next(_reader(table))


def _months(header: list[str]) -> list[str]:
    return [column for column in header if MONTH.fullmatch(column)]


def _accesses(archive: zipfile.ZipFile, name: str, window: list[str]) -> Iterator[tuple[str, str]]:
    """Yields the code and the access medium of each row with an access in some month of the window."""
    with archive.open(name) as table:
        rows = _reader(table)
        header = next(rows)
        code, medium = header.index(CODE), header.index(MEDIUM)
        in_window = [index for index, column in enumerate(header) if column in window]
        for row in rows:
            if any(row[index] not in ("", "0") for index in in_window):
                yield row[code], row[medium]


def _reader(table) -> Iterator[list[str]]:
    return csv.reader(io.TextIOWrapper(table, encoding="utf-8-sig", newline=""), delimiter=";")
