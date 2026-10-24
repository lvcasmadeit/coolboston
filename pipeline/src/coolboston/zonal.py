"""Raster -> per-H3-cell mean. Each pixel is assigned to the cell containing its centre."""

import h3
import numpy as np
from affine import Affine
from pyproj import Transformer

from coolboston.grid import RESOLUTION


def pixel_cells(transform: Affine, shape: tuple[int, int], crs, resolution: int = RESOLUTION) -> np.ndarray:
    """H3 cell id for every pixel centre of a raster grid (object array, shape `shape`)."""
    rows, cols = np.indices(shape)
    c, r = cols + 0.5, rows + 0.5
    t = transform
    xs, ys = t.a * c + t.b * r + t.c, t.d * c + t.e * r + t.f
    lng, lat = Transformer.from_crs(crs, 4326, always_xy=True).transform(xs, ys)
    cells = [h3.latlng_to_cell(la, ln, resolution) for la, ln in zip(lat.ravel(), lng.ravel())]
    return np.array(cells, dtype=object).reshape(shape)


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
