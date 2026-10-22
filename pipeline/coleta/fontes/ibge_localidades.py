import sqlite3
import tempfile
import zipfile
from contextlib import closing
from pathlib import Path

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "ibge-localidades"
TITLE = "IBGE, Localidades do Brasil 2022"
YEAR_LABEL = "2022"
LANDING_URL = "https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/"
CREDIT = "IBGE. Localidades do Brasil 2022."
ARCHIVE = RemoteFile(
    "Localidades_Brasil_gpkg.zip",
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/"
    "Localidades_do_Brasil/2022/Localidades_Brasil_gpkg.zip",
)
FILES = (ARCHIVE,)
GEOPACKAGE = "BR_localidades_2022.gpkg"
COLUMNS = ("nome", "uf", "latitude", "longitude")

# Capitals appear twice among the 'Cidade' rows (Sede Municipal and Capital Estadual), at the same point.
SEATS_QUERY = """
    select CD_MUN, NM_MUN, SIGLA_UF, LAT_LOCALIDADE, LONG_LOCALIDADE
    from BR_localidades_2022
    where CT_LOCALIDADE = 'Cidade'
    order by id
"""


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    with zipfile.ZipFile(folder / ARCHIVE.name) as archive, tempfile.TemporaryDirectory() as temporary:
        archive.extract(GEOPACKAGE, temporary)
        rows = _read_seats(Path(temporary) / GEOPACKAGE)
    return Extraction(COLUMNS, rows, edition="Localidades do Brasil 2022, GeoPackage")


def _read_seats(geopackage: Path) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    with closing(sqlite3.connect(geopackage)) as connection:
        for code, name, state, latitude, longitude in connection.execute(SEATS_QUERY):
            rows.setdefault(code, {
                "nome": name,
                "uf": state,
                "latitude": f"{latitude:.4f}",
                "longitude": f"{longitude:.4f}",
            })
    return rows
