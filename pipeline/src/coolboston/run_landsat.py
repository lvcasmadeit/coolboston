"""Summer Landsat surface temperature per cell -> the gitignored pipeline/cache/.

Run: uv run python -m coolboston.run_landsat
Values are °F, mid-morning (about 11:15 a.m. EDT, see landsat.py).
  surface_<year>.tif         the composite on the 30 m grid; reused on later runs (no network)
  surface_tiles_<year>.json  per 100 m tile (SPEC-square-grid), read by build_cells.py
"""

import json
import os
from datetime import date
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject, transform_bounds
from rasterio.windows import from_bounds

from coolboston.composite import nan_median, usable
from coolboston.grid import boston_tiles
from coolboston.landsat import BOSTON_BBOX, Scene, search_scenes
from coolboston.lst import celsius_to_f, masked_celsius
from coolboston.zonal import tile_surface_mean

CACHE_DIR = Path(__file__).resolve().parents[2] / "cache"
# Common 30 m grid in UTM 19N, Landsat's native projection and pixel size over Boston.
GRID_CRS = CRS.from_epsg(32619)
PIXEL_M = 30.0

# Remote COG reads: avoid directory listings on every open.
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")


def tiles_cache_path(year: int) -> Path:
    return CACHE_DIR / f"surface_tiles_{year}.json"


def composite_path(year: int) -> Path:
    return CACHE_DIR / f"surface_{year}.tif"


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


def build_composite(year: int) -> tuple[np.ndarray, int]:
    """Median °F composite of the summer's usable scenes on the common grid (needs network)."""
    scenes = search_scenes(year)
    transform, shape = target_grid()
    grids = []
    for s in scenes:
        g = scene_on_grid(s, transform, shape)
        print(f"  {s.id}: {np.isfinite(g).mean():.0%} valid pixels in the Boston box")
        grids.append(g)
    return celsius_to_f(nan_median(grids, year)), len(usable(grids))


def write_composite(path: Path, composite_f: np.ndarray, scenes: int) -> None:
    transform, shape = target_grid()
    path.parent.mkdir(parents=True, exist_ok=True)
    profile = dict(driver="GTiff", width=shape[1], height=shape[0], count=1, dtype="float32",
                   crs=GRID_CRS, transform=transform, nodata=np.nan, compress="deflate")
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(composite_f.astype(np.float32), 1)
        dst.update_tags(scenes=str(scenes))


def read_composite(path: Path) -> tuple[np.ndarray, int]:
    with rasterio.open(path) as src:
        return src.read(1).astype(np.float64), int(src.tags()["scenes"])


def load_composite(year: int) -> tuple[np.ndarray, int]:
    path = composite_path(year)
    if path.exists():
        print(f"using cached composite {path} (no network)")
        return read_composite(path)
    composite_f, scenes = build_composite(year)
    write_composite(path, composite_f, scenes)
    return composite_f, scenes


def _rounded(per_cell: dict[str, float | None]) -> dict[str, float | None]:
    return {c: (None if v is None else round(v, 2)) for c, v in per_cell.items()}


def _write(path: Path, year: int, scenes: int, out: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    meta = {"year": year, "scenes": scenes, "run_date": date.today().isoformat()}
    path.write_text(json.dumps({**meta, "surface_f": out}, allow_nan=False))
    covered = sum(v is not None for v in out.values())
    print(f"{path.name}: {covered} of {len(out)} cells have a surface value ({covered / len(out):.2%})")


def run(year: int = 2019) -> Path:
    composite_f, scenes = load_composite(year)
    transform, _ = target_grid()
    print(f"{scenes} usable scenes")

    tiles = boston_tiles()
    per_tile = tile_surface_mean(composite_f, transform, GRID_CRS, tiles)
    _write(tiles_cache_path(year), year, scenes, _rounded(per_tile))
    return tiles_cache_path(year)


if __name__ == "__main__":
    print(f"wrote {run()}")
