import tempfile
from collections.abc import Iterable, Iterator, Mapping
from pathlib import Path

from dbfread import DBF
from pyreaddbc import dbc2dbf

from coleta.fontes import ibge_censo_criancas
from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "cnes"
TITLE = "CNES/DataSUS"
YEAR = 2026
MONTH = 9
COMPETENCE = f"{YEAR % 100:02d}{MONTH:02d}"
FTP = "ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados"
STATES = (
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
    "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
)
ESTABLISHMENTS = "ST"
BEDS = "LT"
PROFESSIONALS = "PF"

GENERAL_HOSPITAL = "05"
# CNES bed types 1 surgical, 2 clinical, 4 obstetric, 5 pediatric and 6 other specialties. Left out:
# 3 complementary (ICU and intermediate care, which are not inpatient beds) and 7 day hospital.
INPATIENT_BED_TYPES = frozenset({"1", "2", "4", "5", "6"})
PEDIATRICIAN = "225124"

HOSPITAL_COLUMN = "hospital_geral"
PEDIATRICIANS_COLUMN = "pediatras"
RATIO_COLUMN = "pediatras_por_mil_criancas"
COLUMNS = (HOSPITAL_COLUMN, PEDIATRICIANS_COLUMN, RATIO_COLUMN)


class Hospital:
    YES = "sim"
    NO = "não"
    ABSENT = "ausente"


def dbc_file(group: str, state: str) -> RemoteFile:
    name = f"{group}{state}{COMPETENCE}.dbc"
    return RemoteFile(name, f"{FTP}/{group}/{name}")


FILES = tuple(dbc_file(group, state) for group in (ESTABLISHMENTS, BEDS, PROFESSIONALS) for state in STATES)


def competence_label() -> str:
    return f"{YEAR}-{MONTH:02d}"


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    children_folder = folder.parent / ibge_censo_criancas.NAME
    if not (children_folder / ibge_censo_criancas.CHILDREN.name).exists():
        raise SystemExit(f"{NAME}: faltam as crianças do Censo; rode baixar {ibge_censo_criancas.NAME} antes")
    children = {
        code: int(row[ibge_censo_criancas.CHILDREN_COLUMN])
        for code, row in ibge_censo_criancas.extract(children_folder).rows.items()
    }
    present: set[str] = set()
    hospitals: set[str] = set()
    pediatricians: dict[str, int] = {}
    for state in STATES:
        present |= municipalities_in_base(_records(folder, ESTABLISHMENTS, state))
        hospitals |= municipalities_with_general_hospital(_records(folder, BEDS, state))
        pediatricians |= count_pediatricians(_records(folder, PROFESSIONALS, state))
    rows = build_rows(children, present, hospitals, pediatricians)
    return Extraction(COLUMNS, rows, edition=f"Competência {competence_label()}, DBC ST, LT e PF das 27 UFs")


def municipalities_in_base(establishments: Iterable[Mapping]) -> set[str]:
    return {record["CODUFMUN"] for record in establishments}


def municipalities_with_general_hospital(beds: Iterable[Mapping]) -> set[str]:
    return {
        record["CODUFMUN"]
        for record in beds
        if record["TP_UNID"] == GENERAL_HOSPITAL and record["TP_LEITO"] in INPATIENT_BED_TYPES and record["QT_EXIST"] > 0
    }


def count_pediatricians(professionals: Iterable[Mapping]) -> dict[str, int]:
    """Distinct pediatricians per municipality: one CPF counts once in each municipality where it has a bond."""
    people: dict[str, set[str]] = {}
    for record in professionals:
        if record["CBO"] == PEDIATRICIAN:
            people.setdefault(record["CODUFMUN"], set()).add(record["CPF_PROF"])
    return {municipality: len(cpfs) for municipality, cpfs in people.items()}


def build_rows(
    children: Mapping[str, int],
    present: set[str],
    hospitals: set[str],
    pediatricians: Mapping[str, int],
) -> dict[str, dict[str, str]]:
    """Keyed by the 7-digit IBGE code of the Censo; CNES uses the first 6 digits."""
    rows = {}
    for code, kids in children.items():
        municipality = code[:6]
        if municipality not in present:
            rows[code] = {HOSPITAL_COLUMN: Hospital.ABSENT}
            continue
        count = pediatricians.get(municipality, 0)
        rows[code] = {
            HOSPITAL_COLUMN: Hospital.YES if municipality in hospitals else Hospital.NO,
            PEDIATRICIANS_COLUMN: str(count),
            RATIO_COLUMN: f"{count * 1000 / kids:.4f}" if kids else "",
        }
    return rows


def _records(folder: Path, group: str, state: str) -> Iterator[Mapping]:
    with tempfile.TemporaryDirectory() as temporary:
        table = Path(temporary) / f"{group}{state}.dbf"
        dbc2dbf(str(folder / dbc_file(group, state).name), str(table))
        yield from DBF(str(table), encoding="latin-1")
