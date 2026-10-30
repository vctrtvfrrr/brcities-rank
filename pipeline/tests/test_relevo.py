import zipfile

import fiona
import numpy as np
import pytest
import rasterio
from pyproj import Transformer
from rasterio.transform import from_origin
from shapely.geometry import box, mapping

from coleta import extraidos
from coleta.fontes import anadem, ibge_setores
from coleta.fontes.base import Extraction


def vector(path, features, properties, crs="EPSG:3857"):
    driver = "ESRI Shapefile" if path.suffix == ".shp" else "GPKG"
    with fiona.open(path, "w", driver=driver, crs=crs, schema={"geometry": "Polygon", "properties": properties}) as target:
        target.writerecords(features)


def feature(bounds, **props):
    return {"geometry": mapping(box(*bounds)), "properties": props}


def terrain_source(tmp_path, monkeypatch, elevation, seat=(75, 75), sectors=None, transform=None):
    folder = tmp_path / "anadem"
    folder.mkdir()
    vectors = tmp_path / "ibge-setores"
    vectors.mkdir()
    transform = transform or from_origin(0, 150, 30, 30)
    height, width = elevation.shape
    with rasterio.open(folder / "anadem_v1_23K.tif", "w", driver="GTiff", width=width, height=height, count=1, dtype="float32", nodata=-9999, crs="EPSG:3857", transform=transform) as target:
        target.write(elevation.astype("float32"), 1)
    bounds = rasterio.transform.array_bounds(height, width, transform)
    vector(vectors / "municipalities.shp", [feature(bounds, CD_MUN="1")], {"CD_MUN": "str"})
    with zipfile.ZipFile(vectors / ibge_setores.MUNICIPALITIES.name, "w") as archive:
        for path in vectors.glob("municipalities.*"):
            archive.write(path, path.name)
    vector(vectors / ibge_setores.DISTRICTS.name, [feature(bounds, CD_MUN="1", CD_DIST="101")], {"CD_MUN": "str", "CD_DIST": "str"})
    vector(vectors / ibge_setores.SECTORS.name, sectors or [feature(bounds, CD_MUN="1", CD_DIST="101", CD_SIT="1")], {"CD_MUN": "str", "CD_DIST": "str", "CD_SIT": "str"})
    longitude, latitude = Transformer.from_crs(3857, 4326, always_xy=True).transform(*seat)
    extracted = tmp_path / "extraidos"
    extraidos.write(extracted, "ibge-localidades", "Sedes", Extraction(("longitude", "latitude"), {"1": {"longitude": str(longitude), "latitude": str(latitude)}}, "2022"), [])
    monkeypatch.setattr(anadem, "EXTRACTED_DIR", extracted, raising=False)
    return folder


def test_extract_publishes_altitude_under_the_seat_and_terrain_from_the_same_model(tmp_path, monkeypatch):
    elevation = np.tile(np.arange(5) * 3 + 100, (5, 1))
    folder = terrain_source(tmp_path, monkeypatch, elevation)

    result = anadem.extract(folder)

    assert result.columns == ("altitude", "declividade_urbana", "classe_relevo")
    assert float(result.rows["1"]["altitude"]) == 106
    assert float(result.rows["1"]["declividade_urbana"]) == pytest.approx(10, abs=0.01)
    assert result.rows["1"]["classe_relevo"] == "ondulado"


def test_nodata_under_the_seat_uses_the_nearest_valid_pixel_even_beyond_its_neighbours(tmp_path, monkeypatch):
    elevation = np.full((7, 7), -9999.0)
    elevation[1, 5] = 81
    elevation[6, 0] = 27
    folder = terrain_source(tmp_path, monkeypatch, elevation, seat=(119, 119), transform=from_origin(0, 210, 30, 30))

    assert float(anadem.extract(folder).rows["1"]["altitude"]) == 81


def test_urban_mean_excludes_rural_sectors_and_other_districts(tmp_path, monkeypatch):
    elevation = np.tile([100, 100, 100, 130, 190, 280, 400], (7, 1))
    sectors = [
        feature((30, 30, 90, 120), CD_MUN="1", CD_DIST="101", CD_SIT="2"),
        feature((90, 30, 150, 120), CD_MUN="1", CD_DIST="101", CD_SIT="8"),
        feature((150, 30, 210, 120), CD_MUN="1", CD_DIST="102", CD_SIT="1"),
    ]
    folder = terrain_source(tmp_path, monkeypatch, elevation, sectors=sectors, transform=from_origin(0, 210, 30, 30))

    assert float(anadem.extract(folder).rows["1"]["declividade_urbana"]) == 25


@pytest.mark.parametrize("right_width, expected", [(5, "plano"), (7, "montanhoso")])
def test_class_uses_the_largest_territorial_area_and_the_flatter_class_on_a_tie(tmp_path, monkeypatch, right_width, expected):
    elevation = np.zeros((5, 6 + right_width), dtype="float32")
    elevation[:, :5] = 100
    elevation[:, 5] = -9999
    elevation[:, 6:] = np.arange(right_width) * 18 + 100
    folder = terrain_source(tmp_path, monkeypatch, elevation)

    assert anadem.extract(folder).rows["1"]["classe_relevo"] == expected


def test_municipality_without_terrain_publishes_empty_cells(tmp_path, monkeypatch):
    folder = terrain_source(tmp_path, monkeypatch, np.full((5, 5), -9999.0))

    assert anadem.extract(folder).rows == {"1": {"altitude": "", "declividade_urbana": "", "classe_relevo": ""}}


@pytest.mark.parametrize("slope, expected", [(0, "plano"), (3, "plano"), (3.1, "suave ondulado"), (8, "suave ondulado"), (8.1, "ondulado"), (20, "ondulado"), (20.1, "forte ondulado"), (45, "forte ondulado"), (45.1, "montanhoso"), (75, "montanhoso"), (75.1, "escarpado")])
def test_embrapa_boundaries_belong_to_the_flatter_class(tmp_path, monkeypatch, slope, expected):
    elevation = np.tile(np.arange(5) * slope, (5, 1))
    folder = terrain_source(tmp_path, monkeypatch, elevation, seat=(250, 250), transform=from_origin(0, 500, 100, 100))

    assert anadem.extract(folder).rows["1"]["classe_relevo"] == expected


@pytest.mark.parametrize("latitude, expected_slope, expected_class", [(0, 13.47, "ondulado"), (60, 26.88, "forte ondulado")])
def test_geographic_grid_converts_pixel_spacing_to_metres_at_the_city_latitude(tmp_path, monkeypatch, latitude, expected_slope, expected_class):
    elevation = np.tile(np.arange(5) * 3, (5, 1))
    _, y = Transformer.from_crs(4326, 3857, always_xy=True).transform(0, latitude)
    folder = terrain_source(tmp_path, monkeypatch, elevation, seat=(75, y + 75), transform=from_origin(0, y + 150, 30, 30))
    path = folder / "anadem_v1_23K.tif"
    lon, lat = Transformer.from_crs(3857, 4326, always_xy=True).transform(75, y + 75)
    with rasterio.open(path, "r+") as target:
        target.crs = "EPSG:4326"
        target.transform = from_origin(lon - 0.0005, lat + 0.0005, 0.0002, 0.0002)

    result = anadem.extract(folder).rows["1"]

    assert float(result["declividade_urbana"]) == pytest.approx(expected_slope, abs=0.02)
    assert result["classe_relevo"] == expected_class


def test_adjacent_tiles_do_not_duplicate_area_or_create_a_slope_seam(tmp_path, monkeypatch):
    elevation = np.tile(np.arange(5) * 3 + 100, (5, 1)).astype("float32")
    folder = terrain_source(tmp_path, monkeypatch, elevation)
    for name, start, stop in (("23K", 0, 3), ("23L", 3, 5)):
        with rasterio.open(folder / f"anadem_v1_{name}.tif", "w", driver="GTiff", width=stop-start, height=5, count=1, dtype="float32", nodata=-9999, crs="EPSG:3857", transform=from_origin(start * 30, 150, 30, 30)) as target:
            target.write(elevation[:, start:stop], 1)

    result = anadem.extract(folder).rows["1"]

    assert result == {"altitude": "106.00", "declividade_urbana": "10.00", "classe_relevo": "ondulado"}


def test_territorial_majority_uses_area_rather_than_pixel_count_at_different_latitudes(tmp_path, monkeypatch):
    elevation = np.full((11, 5), 100.0)
    elevation[5, :] = -9999
    elevation[6:, :] = np.arange(5) * 10000 + 100
    folder = terrain_source(tmp_path, monkeypatch, elevation, transform=from_origin(0, 330, 30, 30))
    with rasterio.open(folder / "anadem_v1_23K.tif", "r+") as raster:
        raster.crs = "EPSG:4326"
        raster.transform = from_origin(0, 66, 1, 6)
    vectors = folder.parent / "ibge-setores"
    vector(vectors / "municipalities.shp", [feature((0, 0, 5, 66), CD_MUN="1")], {"CD_MUN": "str"}, crs="EPSG:4326")
    with zipfile.ZipFile(vectors / ibge_setores.MUNICIPALITIES.name, "w") as archive:
        for path in vectors.glob("municipalities.*"):
            archive.write(path, path.name)

    assert anadem.extract(folder).rows["1"]["classe_relevo"] == "ondulado"


def test_single_district_city_keeps_urban_data_when_the_seat_point_falls_just_outside_its_boundary(tmp_path, monkeypatch):
    elevation = np.tile(np.arange(5) * 3 + 100, (5, 1))
    folder = terrain_source(tmp_path, monkeypatch, elevation)
    vector(folder.parent / "ibge-setores" / ibge_setores.DISTRICTS.name, [feature((0, 0, 74, 150), CD_MUN="1", CD_DIST="101")], {"CD_MUN": "str", "CD_DIST": "str"})

    assert anadem.extract(folder).rows["1"]["declividade_urbana"] == "10.00"
