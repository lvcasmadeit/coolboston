import json
import math

import h3
import pandas as pd

from coolboston.build_hexes import HEX_FIELDS, SCHEMA_VERSION, to_records, write_hexes
from coolboston.grid import RESOLUTION

A = h3.latlng_to_cell(42.3601, -71.0589, RESOLUTION)
B = h3.latlng_to_cell(42.30, -71.10, RESOLUTION)


def _frame():
    return pd.DataFrame(
        {"temp_6am": [74.123456, math.nan], "temp_3pm": [91.98765, math.nan], "temp_7pm": [84.5, 80.0]},
        index=pd.Index([B, A], name="cell"),
    )


def test_records_match_schema_and_are_sorted_by_id():
    records = to_records(_frame())

    assert [r["id"] for r in records] == sorted([A, B])
    assert all(list(r) == list(HEX_FIELDS) for r in records)


def test_values_rounded_and_nan_becomes_none():
    by_id = {r["id"]: r for r in to_records(_frame())}

    assert by_id[B] == {"id": B, "temp6am": 74.12, "temp3pm": 91.99, "temp7pm": 84.5}
    assert by_id[A]["temp3pm"] is None and by_id[A]["temp6am"] is None


def test_written_file_is_valid_json_with_version(tmp_path):
    path = tmp_path / "out" / "hexes.json"

    write_hexes(_frame(), path)

    doc = json.loads(path.read_text())  # strict: would fail on NaN tokens
    assert doc["version"] == SCHEMA_VERSION == 1
    assert list(doc) == ["version", "hexes"]
    assert len(doc["hexes"]) == 2
    assert "NaN" not in path.read_text()
