import json
import math

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import box

from coolboston.build_cells import CELL_FIELDS, SCHEMA_VERSION, load_surface, to_records, write_cells
from coolboston.grid import GRID_CRS, square_tiles

# Tile 2300_9000 is full; 2301_9000 is clipped to x < 230_150 (half a tile).
LAND = box(230_000, 900_000, 230_150, 900_100)


def _tiles():
    return square_tiles(gpd.GeoSeries([LAND], crs=GRID_CRS).to_crs(4326).iloc[0])


def _records():
    air = pd.Series({"2300_9000": 91.98765, "2301_9000": math.nan})
    return to_records(_tiles(), air, {"2300_9000": 101.234, "2301_9000": None})


def test_records_have_schema_fields_in_order():
    records = _records()
    assert [r["id"] for r in records] == ["2300_9000", "2301_9000"]
    assert all(tuple(r) == CELL_FIELDS for r in records)


def test_values_rounded_and_missing_is_none_not_zero():
    full, half = _records()
    assert (full["temp3pm"], full["surface"]) == (91.99, 101.23)
    assert (half["temp3pm"], half["surface"]) == (None, None)


def test_full_tiles_omit_coords_and_clipped_tiles_carry_them():
    full, half = _records()
    assert full["coords"] is None and full["landAreaM2"] == pytest.approx(10_000, rel=1e-3)
    assert half["landAreaM2"] == pytest.approx(5_000, rel=1e-3)
    (rings,) = half["coords"]
    assert rings[0][0] == rings[0][-1]


def test_written_file_is_strict_json_with_version(tmp_path):
    path = tmp_path / "out" / "cells.json"
    write_cells(_records(), path)
    doc = json.loads(path.read_text())
    assert doc["version"] == SCHEMA_VERSION == 4
    assert list(doc) == ["version", "cellSizeM", "crs", "cells"]
    assert (doc["cellSizeM"], doc["crs"]) == (100, "EPSG:26986")
    assert "NaN" not in path.read_text()


def test_missing_surface_cache_fails_loudly(tmp_path):
    with pytest.raises(FileNotFoundError, match="run_landsat"):
        load_surface(tmp_path / "nope.json")
