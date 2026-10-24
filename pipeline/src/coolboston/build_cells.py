"""Write web/data/cells.json, the pipeline -> web contract (mirrored in web/lib/types.ts).

Run: uv run python -m coolboston.run_landsat   (writes the surface cache; reuses the cached composite)
     uv run python -m coolboston.build_cells

Schema v4 (SPEC-square-grid): one record per 100 m tile, clipped to Boston's land.
  id          "{i}_{j}" in EPSG:26986 (grid.py)
  landAreaM2  clipped land area, m²
  coords      GeoJSON MultiPolygon coordinates, WGS84 [lng, lat], for clipped tiles only; null for a
              full 100 m square, which the web rebuilds from the id (web/lib/grid.ts). Keeps the
              file under its 3 MB budget: 11,169 of 13,562 tiles are full.
  temp3pm     Heat Watch July 2019 3pm air, °F, area-weighted over the tile's land (null if unsampled)
  surface     Landsat summer 2019 median, °F, MID-MORNING (null if no clear pixel)
"""

import json
import math
from pathlib import Path

import geopandas as gpd
import pandas as pd

from coolboston.grid import CELL_SIZE_M, GRID_CRS, boston_tiles, tile_coordinates
from coolboston.heatwatch import heatwatch_for_tiles
from coolboston.run_landsat import tiles_cache_path

SCHEMA_VERSION = 4
SURFACE_YEAR = 2019
OUT_PATH = Path(__file__).resolve().parents[3] / "web" / "data" / "cells.json"
CELL_FIELDS = ("id", "landAreaM2", "coords", "temp3pm", "surface")


def _num(v: float | None) -> float | None:
    return None if v is None or math.isnan(v) else round(float(v), 2)


def load_surface(cache: Path) -> dict[str, float | None]:
    if not cache.exists():
        raise FileNotFoundError(f"{cache} missing: run `uv run python -m coolboston.run_landsat` first")
    return json.loads(cache.read_text())["surface_f"]


def is_full(geom) -> bool:
    """The clipped tile is the whole 100 m square (a hole-free polygon inside the square with the
    square's area can only be the square itself)."""
    return geom.geom_type == "Polygon" and not geom.interiors and abs(geom.area - CELL_SIZE_M**2) < 1e-3


def to_records(tiles: gpd.GeoDataFrame, air: pd.Series, surface: dict[str, float | None]) -> list[dict]:
    """One record per tile, in the tiles' (i, j) order. Missing values are None, never 0."""
    coords = tile_coordinates(tiles)
    return [
        {
            "id": tid,
            "landAreaM2": round(float(area), 1),
            "coords": None if is_full(g) else c,
            "temp3pm": _num(air.get(tid)),
            "surface": _num(surface.get(tid)),
        }
        for tid, area, c, g in zip(tiles.id, tiles.land_area_m2, coords, tiles.geometry)
    ]


def write_cells(records: list[dict], path: Path = OUT_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = {"version": SCHEMA_VERSION, "cellSizeM": CELL_SIZE_M, "crs": f"EPSG:{GRID_CRS}", "cells": records}
    # allow_nan=False: fail loudly rather than emit invalid JSON.
    path.write_text(json.dumps(doc, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    tiles = boston_tiles()
    records = to_records(tiles, heatwatch_for_tiles(tiles)["temp_3pm"], load_surface(tiles_cache_path(SURFACE_YEAR)))
    write_cells(records)
    n = len(records)
    air = sum(r["temp3pm"] is not None for r in records)
    surf = sum(r["surface"] is not None for r in records)
    print(f"wrote {n} tiles to {OUT_PATH} ({OUT_PATH.stat().st_size / 1e6:.2f} MB)")
    print(f"air {air} ({air / n:.2%}), surface {surf} ({surf / n:.2%}), both {sum(r['temp3pm'] is not None and r['surface'] is not None for r in records)}")
