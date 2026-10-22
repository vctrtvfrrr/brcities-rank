import csv
from collections import defaultdict
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

from coleta.fontes import casa_civil, ibge_estimativas, sgb
from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "atlas-desastres"
TITLE = "Atlas Digital de Desastres no Brasil"
VERSION = "v1.1 de 2026-08-06"
DATABASE = RemoteFile(
    "BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv",
    "https://atlasdigital.mdr.gov.br/arquivos/2026/BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv",
)
FILES = (DATABASE,)
FIRST_YEAR = 2016
LAST_YEAR = 2025
HUMAN_DAMAGE_FIELDS = ("DH_MORTOS", "DH_DESABRIGADOS", "DH_DESALOJADOS")

RAIN_YEARS_COLUMN = "anos_chuva"
WIND_YEARS_COLUMN = "anos_vento_granizo"
YEARS_COLUMN = "anos_desastre"
DAMAGE_COLUMN = "danos_chuva"
DAMAGE_RATE_COLUMN = "danos_chuva_por_mil"
SUSCEPTIBLE_COLUMN = "suscetivel"
COLUMNS = (YEARS_COLUMN, RAIN_YEARS_COLUMN, WIND_YEARS_COLUMN, DAMAGE_COLUMN)
POPULATION_COLUMN = ibge_estimativas.population_column(2026)


class Family(Enum):
    RAIN = "chuva"
    WIND = "vento e granizo"


RAIN_CODES = {"12100", "12200", "12300", "13214"}
MASS_MOVEMENT_PREFIX = "113"
WIND_CODES = {"13111", "13112", "13211", "13212", "13213", "13215"}


def family(cobrade: str) -> Family | None:
    """Heavy rain (13214) is also a local storm in the COBRADE, but counts only once, in the rain family."""
    if cobrade in RAIN_CODES or cobrade.startswith(MASS_MOVEMENT_PREFIX):
        return Family.RAIN
    if cobrade in WIND_CODES:
        return Family.WIND
    return None


@dataclass
class Tally:
    rain_years: set[int] = field(default_factory=set)
    wind_years: set[int] = field(default_factory=set)
    rain_damage: int = 0

    @property
    def years(self) -> float:
        """From 0 to 15: a year with a wind or hail record is worth half a year with a rain record."""
        return len(self.rain_years) + len(self.wind_years) / 2


def tally(records: Iterable[Mapping[str, str]]) -> dict[str, Tally]:
    """Counts years, not records, so renewed decrees and duplicated forms weigh once; every status counts."""
    tallies: dict[str, Tally] = defaultdict(Tally)
    for record in records:
        year = int(record["Data_Evento"][-4:])
        kind = family(record["Cod_Cobrade"].strip())
        if not FIRST_YEAR <= year <= LAST_YEAR or kind is None:
            continue
        entry = tallies[record["Cod_IBGE_Mun"].strip()]
        if kind is Family.RAIN:
            entry.rain_years.add(year)
            entry.rain_damage += sum(int(record[name]) for name in HUMAN_DAMAGE_FIELDS)
        else:
            entry.wind_years.add(year)
    return dict(tallies)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    with (folder / DATABASE.name).open(encoding="latin-1", newline="") as source:
        tallies = tally(csv.DictReader(source, delimiter=";"))
    rows = {
        code: {
            YEARS_COLUMN: f"{entry.years:g}",
            RAIN_YEARS_COLUMN: str(len(entry.rain_years)),
            WIND_YEARS_COLUMN: str(len(entry.wind_years)),
            DAMAGE_COLUMN: str(entry.rain_damage),
        }
        for code, entry in tallies.items()
    }
    return Extraction(COLUMNS, rows, edition=f"{VERSION}, eventos de {FIRST_YEAR} a {LAST_YEAR}")


def derive(row: Mapping[str, str]) -> dict[str, str]:
    """A municipality absent from the Atlas had no record: zero, not missing data."""
    counts = {column: row.get(column) or "0" for column in COLUMNS}
    population = row.get(POPULATION_COLUMN, "")
    rate = f"{int(counts[DAMAGE_COLUMN]) * 1000 / int(population):.4f}" if population else ""
    susceptible = row.get(casa_civil.COLUMN) == casa_civil.YES or int(row.get(sgb.COLUMN) or 0) > 0
    return counts | {
        DAMAGE_RATE_COLUMN: rate,
        SUSCEPTIBLE_COLUMN: casa_civil.YES if susceptible else casa_civil.NO,
    }
