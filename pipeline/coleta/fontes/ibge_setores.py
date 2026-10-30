from pathlib import Path

import fiona
from shapely import transform
from shapely.geometry import Point, shape
from shapely.ops import unary_union
from pyproj import Transformer

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "ibge-setores"
TITLE = "IBGE, Malhas de municípios, distritos e setores censitários do Censo 2022"
YEAR_LABEL = "2022"
LANDING_URL = "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
CREDIT = "IBGE. Malha Municipal 2022 e Malha de Setores Censitários do Censo 2022."
CENSUS_URL = LANDING_URL + "malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/"
MUNICIPALITIES = RemoteFile("BR_Municipios_2022.zip", LANDING_URL + "malhas_municipais/municipio_2022/Brasil/BR/BR_Municipios_2022.zip")
DISTRICTS = RemoteFile("BR_distritos_CD2022.gpkg", CENSUS_URL + "distritos/gpkg/BR/BR_distritos_CD2022.gpkg")
SECTORS = RemoteFile("BR_setores_CD2022.gpkg", CENSUS_URL + "setores/gpkg/BR/BR_setores_CD2022.gpkg")
FILES = (MUNICIPALITIES, DISTRICTS, SECTORS)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    for remote in FILES:
        with fiona.open(_vector_path(folder, remote)) as features:
            if not features.crs:
                raise ValueError(f"{remote.name}: falta o sistema de coordenadas")
    return Extraction((), {}, edition="Malha Municipal 2022 e malhas definitivas de distritos e setores do Censo 2022")


def _vector_path(folder: Path, remote: RemoteFile) -> str:
    path = (folder / remote.name).resolve()
    return f"zip://{path}" if path.suffix == ".zip" else str(path)


def areas(folder: Path, seats: dict[str, dict[str, str]]):
    territories = {}
    with fiona.open(_vector_path(folder, MUNICIPALITIES)) as features:
        project = Transformer.from_crs(features.crs, 4326, always_xy=True).transform
        for feature in features:
            code = str(feature["properties"]["CD_MUN"])
            if code in seats:
                territories[code] = transform(shape(feature["geometry"]), project, interleaved=False)
    points = {code: Point(float(seat["longitude"]), float(seat["latitude"])) for code, seat in seats.items()}
    seat_districts = {}
    districts_by_city = {}
    with fiona.open(_vector_path(folder, DISTRICTS)) as features:
        project = Transformer.from_crs(features.crs, 4326, always_xy=True).transform
        for feature in features:
            props = feature["properties"]
            code = str(props["CD_MUN"])
            if code in points:
                district = str(props["CD_DIST"])
                districts_by_city.setdefault(code, set()).add(district)
                if transform(shape(feature["geometry"]), project, interleaved=False).covers(points[code]):
                    seat_districts[code] = district
    for code, districts in districts_by_city.items():
        if code not in seat_districts and len(districts) == 1:
            seat_districts[code] = next(iter(districts))
    urban = {}
    water = {}
    with fiona.open(_vector_path(folder, SECTORS)) as features:
        project = Transformer.from_crs(features.crs, 4326, always_xy=True).transform
        for feature in features:
            props = feature["properties"]
            code = str(props["CD_MUN"])
            if code in territories and str(props["CD_SIT"]) == "9":
                water.setdefault(code, []).append(transform(shape(feature["geometry"]), project, interleaved=False))
            if str(props["CD_DIST"]) == seat_districts.get(code) and str(props["CD_SIT"]) in {"1", "2", "3"}:
                urban.setdefault(code, []).append(transform(shape(feature["geometry"]), project, interleaved=False))
    for code, polygons in water.items():
        territories[code] = territories[code].difference(unary_union(polygons))
    return territories, {code: unary_union(polygons) for code, polygons in urban.items()}
