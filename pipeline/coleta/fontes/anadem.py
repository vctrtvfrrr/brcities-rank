import math
from contextlib import ExitStack
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Geod, Transformer
from rasterio.features import rasterize
from rasterio.merge import merge
from rasterio.transform import from_origin
from rasterio.windows import Window, bounds as window_bounds
from shapely import transform as project_geometry
from shapely.geometry import box, mapping
from shapely.strtree import STRtree

from coleta import EXTRACTED_DIR, extraidos
from coleta.fontes import ibge_localidades, ibge_setores
from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "anadem"
TITLE = "ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul"
YEAR_LABEL = "2024"
LANDING_URL = "https://hge-iph.github.io/anadem/"
CREDIT = "Laipelt et al. (2024). ANADEM: A Digital Terrain Model for South America. ANA e UFRGS. CC BY 4.0. Valores derivados de altitude e declividade."
ALTITUDE_COLUMN = "altitude"
SLOPE_COLUMN = "declividade_urbana"
CLASS_COLUMN = "classe_relevo"
COLUMNS = (ALTITUDE_COLUMN, SLOPE_COLUMN, CLASS_COLUMN)
CLASSES = ("plano", "suave ondulado", "ondulado", "forte ondulado", "montanhoso", "escarpado")
TILES = ('18L', '18M', '19L', '19M', '19N', '20K', '20L', '20M', '20N', '21H', '21J', '21K', '21L', '21M', '21N', '22H', '22J', '22K', '22L', '22M', '22N', '23J', '23K', '23L', '23M', '24K', '24L', '24M', '25L', '25M')
FILES = tuple(RemoteFile(f"anadem_v1_{tile}.tif", f"https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_{tile}.tif") for tile in TILES)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    seats = extraidos.read(EXTRACTED_DIR, ibge_localidades.NAME).rows
    territories, urban = ibge_setores.areas(folder.parent / ibge_setores.NAME, seats)
    codes = sorted(seats)
    labels = {code: index + 1 for index, code in enumerate(codes)}
    sums = np.zeros(len(codes) + 1)
    counts = np.zeros(len(codes) + 1, dtype="int64")
    class_areas = np.zeros((len(codes) + 1, len(CLASSES)))
    rows = {code: {column: "" for column in COLUMNS} for code in codes}
    with ExitStack() as stack:
        rasters = [stack.enter_context(rasterio.open(folder / remote.name)) for remote in FILES if (folder / remote.name).exists()]
        if not rasters:
            raise FileNotFoundError(f"{folder}: faltam as folhas GeoTIFF do ANADEM")
        crs = rasters[0].crs
        if any(r.crs != crs or not np.allclose(r.res, rasters[0].res) for r in rasters):
            raise ValueError("As folhas ANADEM precisam ter a mesma projeção e resolução")
        project = Transformer.from_crs(4326, crs, always_xy=True).transform
        regions = [(project_geometry(geometry, project, interleaved=False), labels[code]) for code, geometry in territories.items()]
        cities = [(project_geometry(geometry, project, interleaved=False), labels[code]) for code, geometry in urban.items()]
        region_tree = STRtree([geometry for geometry, _ in regions])
        city_tree = STRtree([geometry for geometry, _ in cities])
        left = min(r.bounds.left for r in rasters)
        top = max(r.bounds.top for r in rasters)
        right = max(r.bounds.right for r in rasters)
        bottom = min(r.bounds.bottom for r in rasters)
        dx, dy = rasters[0].res
        grid = from_origin(left, top, dx, dy)
        width = int(np.ceil((right - left) / dx))
        height = int(np.ceil((top - bottom) / dy))
        for code, seat in seats.items():
            value = _altitude(rasters, float(seat["longitude"]), float(seat["latitude"]))
            if value is not None:
                rows[code][ALTITUDE_COLUMN] = f"{value:.2f}"
        block_size = 1024
        for row in range(0, height, block_size):
            if row % (block_size * 16) == 0:
                print(f"{NAME}: processando faixa {row // block_size + 1}/{math.ceil(height / block_size)}", flush=True)
            row_transform = rasterio.windows.transform(Window(-1, row - 1, 1, 1), grid)
            areas = _pixel_areas(row_transform, crs, min(block_size, height - row))
            for col in range(0, width, block_size):
                window = Window(col, row, min(block_size, width - col), min(block_size, height - row))
                bounds = window_bounds(window, grid)
                footprint = box(*bounds)
                region_ids = region_tree.query(footprint, predicate="intersects")
                if not len(region_ids):
                    continue
                halo = Window(col - 1, row - 1, window.width + 2, window.height + 2)
                halo_bounds = window_bounds(halo, grid)
                overlapping = [r for r in rasters if box(*r.bounds).intersects(box(*halo_bounds))]
                if not overlapping:
                    continue
                elevation, affine = merge(overlapping, bounds=halo_bounds, res=(dx, dy), nodata=float("nan"), dtype="float32")
                slope = _slope(elevation[0], affine, crs)
                block_transform = rasterio.windows.transform(window, grid)
                shape = slope.shape
                municipality = rasterize([(mapping(regions[i][0]), regions[i][1]) for i in region_ids], out_shape=shape, transform=block_transform, dtype="int32")
                valid = np.isfinite(slope) & (municipality > 0)
                classes = np.searchsorted([3, 8, 20, 45, 75], slope, side="left")
                for level in range(len(CLASSES)):
                    selected = valid & (classes == level)
                    class_areas[:, level] += np.bincount(municipality[selected], weights=np.broadcast_to(areas[:, None], shape)[selected], minlength=len(codes) + 1)
                city_ids = city_tree.query(footprint, predicate="intersects")
                if len(city_ids):
                    urban_labels = rasterize([(mapping(cities[i][0]), cities[i][1]) for i in city_ids], out_shape=shape, transform=block_transform, dtype="int32")
                    valid = np.isfinite(slope) & (urban_labels > 0)
                    sums += np.bincount(urban_labels[valid], weights=slope[valid], minlength=len(codes) + 1)
                    counts += np.bincount(urban_labels[valid], minlength=len(codes) + 1)
        for code in codes:
            label = labels[code]
            if counts[label]:
                rows[code][SLOPE_COLUMN] = f"{sums[label] / counts[label]:.2f}"
            if class_areas[label].sum():
                rows[code][CLASS_COLUMN] = CLASSES[int(np.argmax(class_areas[label]))]
    return Extraction(COLUMNS, rows, edition="ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022")


def _slope(elevation, affine, crs):
    top_left, top, top_right = elevation[:-2, :-2], elevation[:-2, 1:-1], elevation[:-2, 2:]
    left, center, right = elevation[1:-1, :-2], elevation[1:-1, 1:-1], elevation[1:-1, 2:]
    bottom_left, bottom, bottom_right = elevation[2:, :-2], elevation[2:, 1:-1], elevation[2:, 2:]
    dx, dy = abs(affine.a), abs(affine.e)
    if crs.is_geographic:
        latitudes = affine.f + (np.arange(center.shape[0]) + 1.5) * affine.e
        longitude = np.full_like(latitudes, affine.c)
        geod = Geod(ellps="WGS84")
        dx = geod.inv(longitude, latitudes, longitude + dx, latitudes)[2][:, None]
        dy = geod.inv(longitude, latitudes - dy / 2, longitude, latitudes + dy / 2)[2][:, None]
    else:
        dx *= crs.linear_units_factor[1]
        dy *= crs.linear_units_factor[1]
    horizontal_gradient = (top_right + 2 * right + bottom_right - top_left - 2 * left - bottom_left) / (8 * dx)
    vertical_gradient = (bottom_left + 2 * bottom + bottom_right - top_left - 2 * top - top_right) / (8 * dy)
    slope = np.hypot(horizontal_gradient, vertical_gradient) * 100
    slope[~np.isfinite(center)] = np.nan
    return slope


def _pixel_areas(affine, crs, height):
    if not crs.is_geographic:
        return np.full(height, abs(affine.a * affine.e) * crs.linear_units_factor[1] ** 2)
    geod = Geod(ellps="WGS84")
    areas = []
    for row in range(height):
        y = affine.f + (row + 1) * affine.e
        area, _ = geod.polygon_area_perimeter([affine.c, affine.c + affine.a, affine.c + affine.a, affine.c], [y, y, y + affine.e, y + affine.e])
        areas.append(abs(area))
    return np.array(areas)


def _altitude(rasters, longitude, latitude):
    project = Transformer.from_crs(4326, rasters[0].crs, always_xy=True).transform
    x, y = project(longitude, latitude)
    containing = [r for r in rasters if r.bounds.left <= x < r.bounds.right and r.bounds.bottom < y <= r.bounds.top]
    for raster in containing:
        value = next(raster.sample([(x, y)], masked=True))[0]
        if not np.ma.is_masked(value) and np.isfinite(value):
            return float(value)
    if not containing:
        return None
    radius = 1
    limit = max(max(r.width, r.height) for r in containing)
    while radius <= limit * 2:
        nearest = None
        for raster in rasters:
            row, col = raster.index(x, y)
            window = Window(max(0, col - radius), max(0, row - radius), min(raster.width, col + radius + 1) - max(0, col - radius), min(raster.height, row + radius + 1) - max(0, row - radius))
            if window.width <= 0 or window.height <= 0:
                continue
            values = raster.read(1, window=window, masked=True)
            rr, cc = np.where(~np.ma.getmaskarray(values) & np.isfinite(values.data))
            if not len(rr):
                continue
            xx, yy = rasterio.transform.xy(raster.transform, rr + int(window.row_off), cc + int(window.col_off))
            distances = np.hypot((np.array(xx) - x) * (math.cos(math.radians(y)) if raster.crs.is_geographic else 1), np.array(yy) - y)
            at = int(np.argmin(distances))
            candidate = float(distances[at]), float(values[rr[at], cc[at]])
            if nearest is None or candidate[0] < nearest[0]:
                nearest = candidate
        spacing = min(rasters[0].res) * (math.cos(math.radians(y)) if rasters[0].crs.is_geographic else 1)
        if nearest and nearest[0] <= radius * spacing:
            return nearest[1]
        radius *= 2
    return nearest[1] if nearest else None
