import subprocess
import tempfile
from collections.abc import Iterable, Sequence
from pathlib import Path

import xlrd

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "alvares"
TITLE = "Alvares et al. 2013, Köppen's climate classification map for Brazil"
YEAR_LABEL = "1950 a 1990"
LANDING_URL = "https://www.ipef.br/geodatabase/"
CREDIT = "Alvares, C. A., Stape, J. L., Sentelhas, P. C., Gonçalves, J. L. M. e Sparovek, G. (2013). Köppen's climate classification map for Brazil. Meteorologische Zeitschrift, 22(6), 711–728."
ARCHIVE = RemoteFile("Koppen_Brazil_2013.rar", "https://www.ipef.br/geodatabase/Koppen_Brazil_2013.rar", manual=True)
FILES = (ARCHIVE,)
SPREADSHEET = "Koppen Brazil 2013/Koppen Brazilian municipalities.xls"
SHEET = "Data"
CODE_HEADER = "IBGE-Code"
COLUMN = "koppen_alvares"
SEVEN_ZIP = Path(r"C:\Program Files\7-Zip\7z.exe")


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    with tempfile.TemporaryDirectory() as temporary:
        subprocess.run(
            [SEVEN_ZIP, "e", "-y", f"-o{temporary}", folder / ARCHIVE.name, SPREADSHEET],
            check=True, capture_output=True,
        )
        sheet = xlrd.open_workbook(Path(temporary) / Path(SPREADSHEET).name).sheet_by_name(SHEET)
        table = [sheet.row_values(row) for row in range(sheet.nrows)]
    rows = {code: {COLUMN: climate} for code, climate in read_classes(table).items()}
    return Extraction((COLUMN,), rows, edition="Planilha por município da malha de 2007, classe de maior área")


def read_classes(table: Iterable[Sequence[object]]) -> dict[str, str]:
    """Rio de Janeiro, Angra dos Reis, Itaguaí and Mangaratiba appear twice, with identical rows."""
    header, *data = table
    code_index = header.index(CODE_HEADER)
    # The header of the class column is "Köppen" with a broken encoding.
    class_index = next(index for index, name in enumerate(header) if str(name).startswith("K"))
    classes: dict[str, str] = {}
    for row in data:
        if row[code_index] and row[class_index]:
            classes.setdefault(str(int(row[code_index])), str(row[class_index]).strip())
    return classes
