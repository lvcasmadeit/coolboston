import h3
import pytest
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union

from coolboston.grid import RESOLUTION, cells_for_geometry, load_boundary

# A res-9 cell near Boston City Hall (42.3601, -71.0589).
CENTER = h3.latlng_to_cell(42.3601, -71.0589, RESOLUTION)


def cell_polygon(cell: str) -> Polygon:
    # h3 returns (lat, lng); shapely/GeoJSON wants (lng, lat).
    return Polygon([(lng, lat) for lat, lng in h3.cell_to_boundary(cell)])


def test_single_cell_outline_returns_that_cell():
    assert cells_for_geometry(cell_polygon(CENTER)) == [CENTER]


def test_disk_returns_seven_sorted_unique_res9_cells():
    disk = h3.grid_disk(CENTER, 1)
    geom = unary_union([cell_polygon(c) for c in disk]).buffer(1e-7)

    cells = cells_for_geometry(geom)

    assert cells == sorted(disk)
    assert len(set(cells)) == len(cells) == 7
    assert all(h3.is_valid_cell(c) and h3.get_resolution(c) == RESOLUTION for c in cells)


def test_multipolygon_parts_are_combined_without_duplicates():
    far = h3.latlng_to_cell(42.30, -71.10, RESOLUTION)
    geom = MultiPolygon([cell_polygon(CENTER), cell_polygon(far), cell_polygon(CENTER)])

    assert cells_for_geometry(geom) == sorted({CENTER, far})


def test_output_is_deterministic():
    geom = unary_union([cell_polygon(c) for c in h3.grid_disk(CENTER, 2)]).buffer(1e-7)
    assert cells_for_geometry(geom) == cells_for_geometry(geom)


def test_load_boundary_reprojects_and_dissolves(tmp_path):
    path = tmp_path / "b.geojson"
    path.write_text(
        '{"type":"FeatureCollection","features":['
        '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":'
        "[[[-71.06,42.36],[-71.05,42.36],[-71.05,42.37],[-71.06,42.37],[-71.06,42.36]]]}},"
        '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":'
        "[[[-71.05,42.36],[-71.04,42.36],[-71.04,42.37],[-71.05,42.37],[-71.05,42.36]]]}}]}"
    )

    geom = load_boundary(path)

    assert geom.geom_type == "Polygon"
    assert geom.bounds == pytest.approx((-71.06, 42.36, -71.04, 42.37))
