import json
import tempfile
from collections import Counter
from collections.abc import Iterator, Mapping
from datetime import datetime
from pathlib import Path

import pyreaddbc

from coleta.fontes import ibge_censo_populacao, ibge_estimativas
from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "sim"
TITLE = "SIM/DataSUS, Declarações de Óbito"
FTP = "ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES"
YEARS = (2022, 2023, 2024)
UFS = (
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
    "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
)
LISTING = RemoteFile("dores.txt", f"{FTP}/")
MUNICIPALITIES = RemoteFile(
    "municipios.json", "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado"
)


def death_file(uf: str, year: int) -> RemoteFile:
    return RemoteFile(f"DO{uf}{year}.dbc", f"{FTP}/DO{uf}{year}.dbc")


def deaths_column(year: int) -> str:
    return f"homicidios_{year}"


FILES = (LISTING, MUNICIPALITIES, *(death_file(uf, year) for year in YEARS for uf in UFS))
DEATH_COLUMNS = tuple(deaths_column(year) for year in YEARS)
POPULATION_COLUMNS = (ibge_censo_populacao.COLUMN, ibge_estimativas.population_column(2024))
RATE_COLUMN = "homicidios_por_100_mil"


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    """Homicides by municipality of residence; the files are split by state of occurrence."""
    codes = _seven_digit_codes(folder / MUNICIPALITIES.name)
    rows: dict[str, dict[str, str]] = {}
    for year in YEARS:
        for residence, count in sorted(_homicides_by_residence(folder, year).items()):
            if residence in codes:
                rows.setdefault(codes[residence], {})[deaths_column(year)] = str(count)
    return Extraction(DEATH_COLUMNS, rows, edition=_edition(folder / LISTING.name))


def is_homicide(cause: str) -> bool:
    """Assault (X85–Y09) and legal intervention (Y35–Y36), as the underlying cause in ICD-10."""
    category = cause[:3]
    return "X85" <= category <= "Y09" or "Y35" <= category <= "Y36"


def homicide_rate(deaths: int, census_2022: int, estimate_2024: int) -> float:
    """Per 100 thousand person-years; IBGE published no estimate for 2023, so it is the mean of 2022 and 2024."""
    person_years = census_2022 + (census_2022 + estimate_2024) / 2 + estimate_2024
    return deaths * 100_000 / person_years


def derive(row: Mapping[str, str]) -> dict[str, str]:
    """A municipality absent from the SIM had no homicide: zero, not missing data."""
    deaths = {column: row.get(column) or "0" for column in DEATH_COLUMNS}
    census, estimate = (row.get(column, "") for column in POPULATION_COLUMNS)
    if not (census and estimate):
        return deaths | {RATE_COLUMN: ""}
    rate = homicide_rate(sum(map(int, deaths.values())), int(census), int(estimate))
    return deaths | {RATE_COLUMN: f"{rate:.4f}"}


def _seven_digit_codes(path: Path) -> dict[str, str]:
    """The SIM codes municipalities by the first six digits of the IBGE code, without the check digit."""
    municipalities = json.loads(path.read_text(encoding="utf-8"))
    return {str(entry["municipio-id"])[:6]: str(entry["municipio-id"]) for entry in municipalities}


def _homicides_by_residence(folder: Path, year: int) -> Counter[str]:
    counts: Counter[str] = Counter()
    for uf in UFS:
        dbf = _decompress(folder / death_file(uf, year).name)
        for residence, cause in read_dbf(dbf, ("CODMUNRES", "CAUSABAS")):
            if is_homicide(cause):
                counts[residence] += 1
    return counts


def _decompress(dbc: Path) -> bytes:
    with tempfile.TemporaryDirectory() as temporary:
        dbf = Path(temporary) / dbc.with_suffix(".dbf").name
        pyreaddbc.dbc2dbf(str(dbc), str(dbf))
        return dbf.read_bytes()


def read_dbf(data: bytes, fields: tuple[str, ...]) -> Iterator[tuple[str, ...]]:
    """Minimal dBase III reader: a header of 32-byte field descriptors ended by 0x0D, then fixed-width
    records, each one led by a deletion flag ('*' when deleted)."""
    count = int.from_bytes(data[4:8], "little")
    header_length = int.from_bytes(data[8:10], "little")
    record_length = int.from_bytes(data[10:12], "little")
    spans = {}
    offset = 1
    for descriptor in range(32, header_length, 32):
        if data[descriptor] == 0x0D:
            break
        name = data[descriptor:descriptor + 11].split(b"\0")[0].decode("ascii")
        length = data[descriptor + 16]
        spans[name] = (offset, offset + length)
        offset += length
    wanted = [spans[field] for field in fields]
    for index in range(count):
        start = header_length + index * record_length
        if data[start:start + 1] == b"*":
            continue
        yield tuple(data[start + first:start + last].decode("latin-1").strip() for first, last in wanted)


def _edition(listing: Path) -> str:
    names = {death_file(uf, year).name for uf in UFS for year in YEARS}
    published = sorted(
        datetime.strptime(fields[0], "%m-%d-%y").date()
        for fields in map(str.split, listing.read_text(encoding="latin-1").splitlines())
        if fields and fields[-1] in names
    )
    return (
        f"DORES (definitivo) de {YEARS[0]} a {YEARS[-1]}, "
        f"arquivos publicados de {published[0].isoformat()} a {published[-1].isoformat()}"
    )
