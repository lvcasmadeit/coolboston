"""Raster -> per-cell mean. Each pixel is assigned to the cell (H3 cell or square tile) containing its centre."""

import geopandas as gpd
import h3
import numpy as np
import shapely
from affine import Affine
from pyproj import Transformer

from coolboston.grid import CELL_SIZE_M, GRID_CRS, RESOLUTION, tile_id


def pixel_cells(transform: Affine, shape: tuple[int, int], crs, resolution: int = RESOLUTION) -> np.ndarray:
    """H3 cell id for every pixel centre of a raster grid (object array, shape `shape`)."""
    rows, cols = np.indices(shape)
    c, r = cols + 0.5, rows + 0.5
    t = transform
    xs, ys = t.a * c + t.b * r + t.c, t.d * c + t.e * r + t.f
    lng, lat = Transformer.from_crs(crs, 4326, always_xy=True).transform(xs, ys)
    cells = [h3.latlng_to_cell(la, ln, resolution) for la, ln in zip(lat.ravel(), lng.ravel())]
    return np.array(cells, dtype=object).reshape(shape)


def pixel_centres(transform: Affine, shape: tuple[int, int]) -> tuple[np.ndarray, np.ndarray]:
    rows, cols = np.indices(shape)
    c, r = cols + 0.5, rows + 0.5
    t = transform
    return t.a * c + t.b * r + t.c, t.d * c + t.e * r + t.f


def pixel_tiles(
    transform: Affine, shape: tuple[int, int], crs, tiles: gpd.GeoDataFrame, clip: bool = True
) -> np.ndarray:
    """Tile id for every pixel centre (object array, shape `shape`); None outside every tile.

    The centre is reprojected to GRID_CRS and floored to (i, j). With `clip`, the centre of a
    clipped (partial) tile's pixel must also fall on the tile's land; without it, anywhere in the
    full 100 m square counts. `tiles` comes from grid.square_tiles.
    """
    xs, ys = pixel_centres(transform, shape)
    x, y = Transformer.from_crs(crs, GRID_CRS, always_xy=True).transform(xs.ravel(), ys.ravel())
    i = np.floor(x / CELL_SIZE_M).astype(int)
    j = np.floor(y / CELL_SIZE_M).astype(int)
    geom = dict(zip(tiles.id, tiles.geometry))
    partial = set(tiles.id[tiles.land_area_m2 < CELL_SIZE_M**2 - 1]) if clip else set()
    out = np.full(x.shape, None, dtype=object)
    for k, (a, b) in enumerate(zip(i, j)):
        t = tile_id(a, b)
        if t in geom and (t not in partial or shapely.contains_xy(geom[t], x[k], y[k])):
            out[k] = t
    return out.reshape(shape)


def tile_surface_mean(values: np.ndarray, transform: Affine, crs, tiles: gpd.GeoDataFrame) -> dict[str, float | None]:
    """Per tile, the mean of valid pixels centred on its land. A tile with none (mostly coastal
    slivers smaller than one 30 m pixel) falls back to valid pixels centred anywhere in its full
    100 m square. None if that is empty too."""
    ids = list(tiles.id)
    primary = zonal_mean(values, pixel_tiles(transform, values.shape, crs, tiles), ids)
    missing = [t for t in ids if primary[t] is None]
    if not missing:
        return primary
    fallback = zonal_mean(values, pixel_tiles(transform, values.shape, crs, tiles, clip=False), missing)
    return {t: (primary[t] if primary[t] is not None else fallback.get(t)) for t in ids}


def zonal_mean(values: np.ndarray, cells: np.ndarray, targets: list[str]) -> dict[str, float | None]:
    """Mean of valid (finite) pixels per target cell; None for a cell with no valid pixel."""
    v = values.ravel()
    c = cells.ravel()
    ok = np.isfinite(v)
    sums: dict[str, float] = {}
    counts: dict[str, int] = {}
    for cell, val in zip(c[ok], v[ok]):
        sums[cell] = sums.get(cell, 0.0) + float(val)
        counts[cell] = counts.get(cell, 0) + 1
    return {t: (sums[t] / counts[t] if t in counts else None) for t in targets}
