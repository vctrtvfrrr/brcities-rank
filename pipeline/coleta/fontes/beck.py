import math
import re
import zipfile
from pathlib import Path

import rasterio
from rasterio.windows import Window

from coleta import EXTRACTED_DIR, extraidos
from coleta.fontes import ibge_localidades
from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "beck"
TITLE = "Beck et al. 2023, High-resolution (1 km) Köppen-Geiger maps for 1901–2099"
ARCHIVE = RemoteFile("koppen_geiger_tif.zip", "https://ndownloader.figshare.com/files/61012822")
FILES = (ARCHIVE,)
PERIOD = "1991_2020"
RASTER = f"{PERIOD}/koppen_geiger_0p00833333.tif"
LEGEND = "legend.txt"
COLUMN = "koppen_beck"
LEGEND_LINE = re.compile(r"^\s*(\d+):\s+([A-Z][A-Za-z]*)\s", re.MULTILINE)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    archive = folder / ARCHIVE.name
    with zipfile.ZipFile(archive) as contents:
        legend = parse_legend(contents.read(LEGEND).decode("latin-1"))
    seats = extraidos.read(EXTRACTED_DIR, ibge_localidades.NAME).rows
    rows: dict[str, dict[str, str]] = {}
    with rasterio.open(f"/vsizip/{archive.resolve().as_posix()}/{RASTER}") as raster:
        for code, seat in seats.items():
            value = sample_class(raster, float(seat["longitude"]), float(seat["latitude"]))
            if value:
                rows[code] = {COLUMN: legend[value]}
    return Extraction((COLUMN,), rows, edition="Figshare 21789074 v2, GeoTIFF de 1991–2020 a 30″ (cerca de 1 km)")


def parse_legend(text: str) -> dict[int, str]:
    return {int(value): label for value, label in LEGEND_LINE.findall(text)}


def sample_class(raster, longitude: float, latitude: float) -> int:
    """The class of the pixel under the seat or, for a seat on the coastline whose pixel is sea (0), of the
    land pixel nearest to the seat among its eight neighbours; 0 when there is none."""
    row, column = raster.index(longitude, latitude)
    block = raster.read(1, window=Window(column - 1, row - 1, 3, 3), boundless=True, fill_value=0)
    if block[1, 1]:
        return int(block[1, 1])
    neighbours = [
        (_distance(raster, row + i - 1, column + j - 1, longitude, latitude), int(block[i, j]))
        for i in range(3)
        for j in range(3)
        if block[i, j]
    ]
    return min(neighbours)[1] if neighbours else 0


def _distance(raster, row: int, column: int, longitude: float, latitude: float) -> float:
    center_longitude, center_latitude = raster.xy(row, column)
    return math.hypot((center_longitude - longitude) * math.cos(math.radians(latitude)), center_latitude - latitude)
