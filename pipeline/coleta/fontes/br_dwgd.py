import re
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import xarray as xr

from coleta import EXTRACTED_DIR, extraidos
from coleta.fontes import ibge_localidades
from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "br-dwgd"
TITLE = "BR-DWGD, Xavier et al. 2022, grade meteorológica diária brasileira"
YEAR_LABEL = "1991 a 2020"
LANDING_URL = "https://github.com/AlexandreCandidoXavier/BR-DWGD"
CREDIT = "Xavier, A. C., Scanlon, B. R., King, C. W. e Alves, A. I. (2022). New improved Brazilian daily weather gridded data (1961–2020). International Journal of Climatology, 42(16), 8390–8404. CC BY 4.0."
RAIN_ARCHIVE = RemoteFile(
    "pr_Tmax_Tmin_NetCDF_Files.zip",
    "https://drive.google.com/file/d/1oQWHpXwFgTKNH4Fa2GwCPJ3QN1AMgNPJ/view",
    manual=True,
)
HUMIDITY_ARCHIVE = RemoteFile(
    "ETo_u2_RH_Rs_NetCDF_Files.zip",
    "https://drive.google.com/file/d/1aGdOHRT10W8oBWvE5IvmEAqJCNQOYYid/view",
    manual=True,
)
FILES = (RAIN_ARCHIVE, HUMIDITY_ARCHIVE)

RAIN = "pr"
MAXIMUM_TEMPERATURE = "Tmax"
MINIMUM_TEMPERATURE = "Tmin"
RELATIVE_HUMIDITY = "RH"
ARCHIVES = {
    RAIN: RAIN_ARCHIVE,
    MAXIMUM_TEMPERATURE: RAIN_ARCHIVE,
    MINIMUM_TEMPERATURE: RAIN_ARCHIVE,
    RELATIVE_HUMIDITY: HUMIDITY_ARCHIVE,
}

HUMIDITY_PERIOD = (1991, 2020)
RAIN_PERIOD = (1991, 2020)
SUMMER_MONTHS = (12, 1, 2)
RAIN_DAY_MM = 1.0
# Alduchov and Eskridge (1996), over water, valid from -40 °C to 50 °C.
MAGNUS_A = 17.625
MAGNUS_B = 243.04

HUMIDITY_COLUMN = "umidade_relativa"
DEW_POINT_COLUMN = "orvalho_dez_fev"
RAIN_DAYS_COLUMN = "dias_de_chuva"
TEMPERATURE_COLUMN = "temp_mes_mais_quente"
COLUMNS = (HUMIDITY_COLUMN, DEW_POINT_COLUMN, RAIN_DAYS_COLUMN, TEMPERATURE_COLUMN)

MEMBER = re.compile(r"^(?P<variable>[A-Za-z0-9]+)_(?P<start>\d{4})\d{4}_(?P<end>\d{4})\d{4}_BR-DWGD_.*_v_(?P<version>\d+(?:\.\d+)*)\.nc$")


@dataclass(frozen=True)
class Member:
    name: str
    variable: str
    start: int
    end: int
    version: str


@dataclass(frozen=True)
class Pixels:
    rows: np.ndarray
    columns: np.ndarray
    displaced: np.ndarray


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    seats = extraidos.read(EXTRACTED_DIR, ibge_localidades.NAME).rows
    codes = sorted(seats)
    latitudes = np.array([float(seats[code]["latitude"]) for code in codes])
    longitudes = np.array([float(seats[code]["longitude"]) for code in codes])
    with tempfile.TemporaryDirectory(dir=folder) as temporary:
        paths = {variable: _unpack(folder, variable, Path(temporary)) for variable in ARCHIVES}
        pixels = locate(*_grid(paths), latitudes, longitudes)
        humidity = daily_series(paths[RELATIVE_HUMIDITY], RELATIVE_HUMIDITY, HUMIDITY_PERIOD, pixels)
        maximum = daily_series(paths[MAXIMUM_TEMPERATURE], MAXIMUM_TEMPERATURE, HUMIDITY_PERIOD, pixels)
        minimum = daily_series(paths[MINIMUM_TEMPERATURE], MINIMUM_TEMPERATURE, HUMIDITY_PERIOD, pixels)
        rain = daily_series(paths[RAIN], RAIN, RAIN_PERIOD, pixels)
    values = {
        HUMIDITY_COLUMN: humidity.mean("time").values,
        DEW_POINT_COLUMN: summer_dew_point(maximum, minimum, humidity).values,
        RAIN_DAYS_COLUMN: rain_days_per_year(rain).values,
        TEMPERATURE_COLUMN: hottest_month_temperature(maximum, minimum).values,
    }
    rows = {
        code: {column: _decimal(values[column][index]) for column in COLUMNS}
        for index, code in enumerate(codes)
    }
    return Extraction(COLUMNS, rows, edition=_edition(paths, int(pixels.displaced.sum())))


def dew_point(temperature, relative_humidity):
    """Magnus formula: temperature in °C and relative humidity in % give the dew point in °C."""
    gamma = np.log(relative_humidity / 100) + MAGNUS_A * temperature / (MAGNUS_B + temperature)
    return MAGNUS_B * gamma / (MAGNUS_A - gamma)


def summer_dew_point(maximum: xr.DataArray, minimum: xr.DataArray, humidity: xr.DataArray) -> xr.DataArray:
    daily = dew_point((maximum + minimum) / 2, humidity)
    return daily.where(daily.time.dt.month.isin(SUMMER_MONTHS), drop=True).mean("time")


def hottest_month_temperature(maximum: xr.DataArray, minimum: xr.DataArray) -> xr.DataArray:
    daily = (maximum + minimum) / 2
    return daily.groupby("time.month").mean("time").max("month", skipna=True)


def rain_days_per_year(rain: xr.DataArray) -> xr.DataArray:
    years = len(np.unique(rain.time.dt.year))
    wet = (rain >= RAIN_DAY_MM).where(rain.notnull())
    return wet.mean("time") * rain.sizes["time"] / years


def locate(
    grid_latitudes: np.ndarray,
    grid_longitudes: np.ndarray,
    valid: np.ndarray,
    latitudes: np.ndarray,
    longitudes: np.ndarray,
) -> Pixels:
    """The grid cell whose center is closest to each point, or the closest valid cell when that one has no data."""
    rows = np.abs(grid_latitudes[None, :] - latitudes[:, None]).argmin(axis=1)
    columns = np.abs(grid_longitudes[None, :] - longitudes[:, None]).argmin(axis=1)
    displaced = ~valid[rows, columns]
    valid_rows, valid_columns = np.nonzero(valid)
    for index in np.flatnonzero(displaced):
        north = grid_latitudes[valid_rows] - latitudes[index]
        east = (grid_longitudes[valid_columns] - longitudes[index]) * np.cos(np.radians(latitudes[index]))
        closest = np.argmin(north**2 + east**2)
        rows[index], columns[index] = valid_rows[closest], valid_columns[closest]
    return Pixels(rows, columns, displaced)


def daily_series(paths: list[Path], variable: str, period: tuple[int, int], pixels: Pixels) -> xr.DataArray:
    """Reads one year at a time: a whole year of the grid fits in memory, the whole period does not."""
    times, values = [], []
    for path in paths:
        with xr.open_dataset(path) as dataset:
            covered = dataset.time.dt.year.values
            for year in range(max(period[0], covered.min()), min(period[1], covered.max()) + 1):
                grid = dataset[variable].sel(time=str(year)).transpose("time", "latitude", "longitude")
                times.append(grid.time.values)
                values.append(grid.values[:, pixels.rows, pixels.columns].astype(np.float32))
    return xr.DataArray(np.concatenate(values), coords={"time": np.concatenate(times)}, dims=("time", "point"))


def members(archive: Path, variable: str, period: tuple[int, int]) -> list[Member]:
    with zipfile.ZipFile(archive) as opened:
        parsed = [_parse(name) for name in opened.namelist()]
    return sorted(
        (
            member for member in parsed
            if member and member.variable == variable and member.start <= period[1] and member.end >= period[0]
        ),
        key=lambda member: member.start,
    )


def _parse(name: str) -> Member | None:
    match = MEMBER.match(Path(name).name)
    if not match:
        return None
    return Member(name, match["variable"], int(match["start"]), int(match["end"]), match["version"])


def _unpack(folder: Path, variable: str, target: Path) -> list[Path]:
    archive = folder / ARCHIVES[variable].name
    period = RAIN_PERIOD if variable == RAIN else HUMIDITY_PERIOD
    selected = members(archive, variable, period)
    if not selected:
        raise ValueError(f"{archive.name} não tem NetCDF de {variable} cobrindo {period[0]}–{period[1]}")
    with zipfile.ZipFile(archive) as opened:
        return [Path(opened.extract(member.name, target)) for member in selected]


def _grid(paths: dict[str, list[Path]]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Grid coordinates and the cells with data on the first day of the period in every variable."""
    valid = None
    for variable, files in paths.items():
        with xr.open_dataset(files[0]) as dataset:
            first_day = dataset[variable].sel(time=f"{HUMIDITY_PERIOD[0]}-01-01").squeeze()
            latitudes, longitudes = dataset.latitude.values, dataset.longitude.values
            has_data = first_day.notnull().values
        valid = has_data if valid is None else valid & has_data
    return latitudes, longitudes, valid


def _edition(paths: dict[str, list[Path]], displaced: int) -> str:
    parsed = [_parse(path.name) for files in paths.values() for path in files]
    versions = ", ".join(sorted({member.version for member in parsed}))
    last_year = max(member.end for member in parsed)
    return (
        f"Versão {versions} da grade diária de 0,1°, série até {last_year}; "
        f"{displaced} sedes caem em pixel sem dado e usam o pixel válido mais próximo"
    )


def _decimal(value: float) -> str:
    return "" if np.isnan(value) else f"{value:.1f}"
