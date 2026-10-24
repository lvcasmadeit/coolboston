"""Write web/data/hexes.json, the pipeline -> web contract (mirrored in web/lib/types.ts).

Run: uv run python -m coolboston.run_landsat   (once; writes the surface cache)
     uv run python -m coolboston.build_hexes
"""

import json
import math
from pathlib import Path

import pandas as pd

from coolboston.grid import boston_cells
from coolboston.heatwatch import heatwatch_for_cells
from coolboston.run_landsat import cache_path

SCHEMA_VERSION = 3
SURFACE_YEAR = 2019
OUT_PATH = Path(__file__).resolve().parents[3] / "web" / "data" / "hexes.json"

# Output field -> pipeline column. Order here is the field order in the JSON.
# surface: summer Landsat composite, °F, mid-morning (see landsat.py).
COLUMNS = {"temp3pm": "temp_3pm", "surface": "surface_f"}
HEX_FIELDS = ("id", *COLUMNS)


def _num(v: float) -> float | None:
    return None if v is None or math.isnan(v) else round(float(v), 2)


def to_records(df: pd.DataFrame) -> list[dict]:
    return [
        {"id": cell, **{out: _num(row[src]) for out, src in COLUMNS.items()}}
        for cell, row in df.sort_index().iterrows()
    ]


def add_surface(df: pd.DataFrame, cache: Path) -> pd.DataFrame:
    """Join the run_landsat cache onto `df` as `surface_f` (NaN where no surface value)."""
    if not cache.exists():
        raise FileNotFoundError(f"{cache} missing: run `uv run python -m coolboston.run_landsat` first")
    surface = json.loads(cache.read_text())["surface_f"]
    return df.assign(surface_f=[math.nan if surface.get(c) is None else surface[c] for c in df.index])


def write_hexes(df: pd.DataFrame, path: Path = OUT_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = {"version": SCHEMA_VERSION, "hexes": to_records(df)}
    # allow_nan=False: fail loudly rather than emit invalid JSON.
    path.write_text(json.dumps(doc, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    df = add_surface(heatwatch_for_cells(boston_cells()), cache_path(SURFACE_YEAR))
    write_hexes(df)
    print(f"wrote {len(df)} hexes to {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.0f} KiB)")
