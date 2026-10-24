import math

import geopandas as gpd
import h3
import pytest
from shapely.geometry import Polygon, box

from coolboston.grid import RESOLUTION
from coolboston.heatwatch import TEMP_COLUMNS, load_heatwatch
from coolboston.join import EQUAL_AREA_CRS, area_weighted_mean, cells_to_gdf

CELL = h3.latlng_to_cell(42.3601, -71.0589, RESOLUTION)
FAR_CELL = h3.latlng_to_cell(42.30, -71.10, RESOLUTION)


def _sources_splitting(cell: str, values_left, values_right):
    """Two source polygons: the left 1/4 and right 3/4 (by projected x-extent) of `cell`."""
    poly = cells_to_gdf([cell]).to_crs(EQUAL_AREA_CRS).geometry.iloc[0]
    minx, miny, maxx, maxy = poly.bounds
    split = minx + (maxx - minx) * 0.4
    left = box(minx - 10, miny - 10, split, maxy + 10)
    right = box(split, miny - 10, maxx + 10, maxy + 10)
    gdf = gpd.GeoDataFrame(
        {"v": [values_left, values_right]}, geometry=[left, right], crs=EQUAL_AREA_CRS
    ).to_crs(4326)
    w_left = poly.intersection(left).area / poly.area
    return gdf, w_left


def test_two_overlapping_sources_give_area_weighted_mean():
    sources, w_left = _sources_splitting(CELL, 80.0, 90.0)

    out = area_weighted_mean([CELL], sources, ["v"])

    assert 0.1 < w_left < 0.5  # the split really is uneven
    assert out.loc[CELL, "v"] == pytest.approx(w_left * 80 + (1 - w_left) * 90, abs=1e-6)


def test_cell_without_overlap_is_null_not_zero():
    sources, _ = _sources_splitting(CELL, 80.0, 90.0)

    out = area_weighted_mean([CELL, FAR_CELL], sources, ["v"])

    assert list(out.index) == [CELL, FAR_CELL]
    assert math.isnan(out.loc[FAR_CELL, "v"])


def test_null_source_values_are_ignored_not_averaged_as_zero():
    sources, _ = _sources_splitting(CELL, None, 90.0)

    out = area_weighted_mean([CELL], sources, ["v"])

    assert out.loc[CELL, "v"] == pytest.approx(90.0)


def test_load_heatwatch_renames_columns_and_treats_zero_as_missing(tmp_path):
    ring = [(-71.06, 42.36), (-71.05, 42.36), (-71.05, 42.37), (-71.06, 42.36)]
    gpd.GeoDataFrame(
        {
            "GRID_ID": ["a", "b"],
            "Mean_am_T_": [75.0, 0.0],
            "Mean_p2_T_": [91.0, 0.0],
            "Mean_ev_T_": [84.0, 0.0],
        },
        geometry=[Polygon(ring), Polygon(ring)],
        crs=4326,
    ).to_file(tmp_path / "hw.geojson")

    gdf = load_heatwatch(tmp_path / "hw.geojson")

    assert list(gdf.columns) == [*TEMP_COLUMNS, "geometry"]
    assert gdf.loc[0, "temp_3pm"] == 91.0
    assert gdf.iloc[1][list(TEMP_COLUMNS)].isna().all()
