"""Summer Landsat surface temperature per H3 cell -> pipeline/cache/surface_<year>.json.

Run: uv run python -m coolboston.run_landsat
Values are °F, mid-morning (about 11:15 a.m. EDT, see landsat.py). Output stays in the
gitignored cache; build_hexes.py reads it.
"""

import json
import os
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject, transform_bounds
from rasterio.windows import from_bounds

from coolboston.composite import nan_median, usable
from coolboston.grid import boston_cells
from coolboston.landsat import BOSTON_BBOX, Scene, search_scenes
from coolboston.lst import celsius_to_f, masked_celsius
from coolboston.zonal import pixel_cells, zonal_mean

CACHE_DIR = Path(__file__).resolve().parents[2] / "cache"
# Common 30 m grid in UTM 19N, Landsat's native projection and pixel size over Boston.
GRID_CRS = CRS.from_epsg(32619)
PIXEL_M = 30.0

# Remote COG reads: avoid directory listings on every open.
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")


def cache_path(year: int) -> Path:
    return CACHE_DIR / f"surface_{year}.json"


def target_grid() -> tuple[rasterio.Affine, tuple[int, int]]:
    w, s, e, n = transform_bounds(4326, GRID_CRS, *BOSTON_BBOX)
    w, s = np.floor(w / PIXEL_M) * PIXEL_M, np.floor(s / PIXEL_M) * PIXEL_M
    e, n = np.ceil(e / PIXEL_M) * PIXEL_M, np.ceil(n / PIXEL_M) * PIXEL_M
    shape = (int((n - s) / PIXEL_M), int((e - w) / PIXEL_M))
    return from_origin(w, n, PIXEL_M, PIXEL_M), shape


def scene_on_grid(scene: Scene, transform, shape) -> np.ndarray:
    """Masked °C for one scene, resampled (nearest) onto the common grid. NaN outside the scene."""
    out = np.full(shape, np.nan, dtype=np.float64)
    with rasterio.open(scene.thermal_href) as st, rasterio.open(scene.qa_href) as qa:
        bounds = transform_bounds(4326, st.crs, *BOSTON_BBOX)
        win = from_bounds(*bounds, transform=st.transform).round_offsets().round_lengths()
        dn = st.read(1, window=win, boundless=True, fill_value=0)
        q = qa.read(1, window=win, boundless=True, fill_value=1)  # bit 0 = fill
        src = masked_celsius(dn, q)
        reproject(
            src,
            out,
            src_transform=st.window_transform(win),
            src_crs=st.crs,
            src_nodata=np.nan,
            dst_transform=transform,
            dst_crs=GRID_CRS,
            dst_nodata=np.nan,
            resampling=Resampling.nearest,
        )
    return out


def run(year: int = 2019) -> Path:
    scenes = search_scenes(year)
    transform, shape = target_grid()
    grids = []
    for s in scenes:
        g = scene_on_grid(s, transform, shape)
        print(f"  {s.id}: {np.isfinite(g).mean():.0%} valid pixels in the Boston box")
        grids.append(g)
    composite_f = celsius_to_f(nan_median(grids, year))

    cells = boston_cells()
    per_cell = zonal_mean(composite_f, pixel_cells(transform, shape, GRID_CRS), cells)
    out = {c: (None if v is None else round(v, 2)) for c, v in per_cell.items()}

    path = cache_path(year)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"year": year, "scenes": len(usable(grids)), "surface_f": out}, allow_nan=False))
    covered = sum(v is not None for v in out.values())
    print(f"{len(usable(grids))} usable scenes; {covered} of {len(cells)} cells have a surface value")
    return path


if __name__ == "__main__":
    print(f"wrote {run()}")
