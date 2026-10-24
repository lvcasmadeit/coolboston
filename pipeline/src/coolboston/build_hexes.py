"""Write web/data/hexes.json, the pipeline -> web contract (mirrored in web/lib/types.ts).

Run: uv run python -m coolboston.build_hexes
"""

import json
import math
from pathlib import Path

import pandas as pd

from coolboston.grid import boston_cells
from coolboston.heatwatch import heatwatch_for_cells

SCHEMA_VERSION = 2
OUT_PATH = Path(__file__).resolve().parents[3] / "web" / "data" / "hexes.json"

# Output field -> pipeline column. Order here is the field order in the JSON.
COLUMNS = {"temp3pm": "temp_3pm"}
HEX_FIELDS = ("id", *COLUMNS)


def _num(v: float) -> float | None:
    return None if v is None or math.isnan(v) else round(float(v), 2)


def to_records(df: pd.DataFrame) -> list[dict]:
    return [
        {"id": cell, **{out: _num(row[src]) for out, src in COLUMNS.items()}}
        for cell, row in df.sort_index().iterrows()
    ]


def write_hexes(df: pd.DataFrame, path: Path = OUT_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = {"version": SCHEMA_VERSION, "hexes": to_records(df)}
    # allow_nan=False: fail loudly rather than emit invalid JSON.
    path.write_text(json.dumps(doc, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    df = heatwatch_for_cells(boston_cells())
    write_hexes(df)
    print(f"wrote {len(df)} hexes to {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.0f} KiB)")
