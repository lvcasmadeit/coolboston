import json
import math

import h3
import pandas as pd

import pytest

from coolboston.build_hexes import HEX_FIELDS, SCHEMA_VERSION, add_surface, to_records, write_hexes
from coolboston.grid import RESOLUTION

A = h3.latlng_to_cell(42.3601, -71.0589, RESOLUTION)
B = h3.latlng_to_cell(42.30, -71.10, RESOLUTION)


def _frame():
    return pd.DataFrame(
        {"temp_3pm": [91.98765, math.nan], "surface_f": [101.234, math.nan]},
        index=pd.Index([B, A], name="cell"),
    )


def test_records_match_schema_and_are_sorted_by_id():
    records = to_records(_frame())

    assert [r["id"] for r in records] == sorted([A, B])
    assert all(list(r) == list(HEX_FIELDS) for r in records)


def test_values_rounded_and_nan_becomes_none():
    by_id = {r["id"]: r for r in to_records(_frame())}

    assert by_id[B] == {"id": B, "temp3pm": 91.99, "surface": 101.23}
    assert by_id[A] == {"id": A, "temp3pm": None, "surface": None}


def test_written_file_is_valid_json_with_version(tmp_path):
    path = tmp_path / "out" / "hexes.json"

    write_hexes(_frame(), path)

    doc = json.loads(path.read_text())  # strict: would fail on NaN tokens
    assert doc["version"] == SCHEMA_VERSION == 3
    assert list(doc) == ["version", "hexes"]
    assert len(doc["hexes"]) == 2
    assert "NaN" not in path.read_text()


def test_add_surface_joins_cache_and_missing_cells_are_nan(tmp_path):
    cache = tmp_path / "surface.json"
    cache.write_text(json.dumps({"year": 2019, "scenes": 9, "surface_f": {B: 99.5, A: None}}))
    df = pd.DataFrame({"temp_3pm": [91.0, 90.0, 89.0]}, index=pd.Index([A, B, "8a0000000000000"], name="cell"))

    out = add_surface(df, cache)

    assert out.loc[B, "surface_f"] == 99.5
    assert math.isnan(out.loc[A, "surface_f"]) and math.isnan(out.loc["8a0000000000000", "surface_f"])


def test_add_surface_without_cache_fails_loudly(tmp_path):
    with pytest.raises(FileNotFoundError, match="run_landsat"):
        add_surface(pd.DataFrame(index=pd.Index([A], name="cell")), tmp_path / "nope.json")
