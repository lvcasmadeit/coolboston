import h3
import pytest
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union

from coolboston.grid import RESOLUTION, cells_for_geometry, load_boundary

# A grid cell near Boston City Hall (42.3601, -71.0589).
CENTER = h3.latlng_to_cell(42.3601, -71.0589, RESOLUTION)


def cell_polygon(cell: str) -> Polygon:
    # h3 returns (lat, lng); shapely/GeoJSON wants (lng, lat).
    return Polygon([(lng, lat) for lat, lng in h3.cell_to_boundary(cell)])


def test_grid_is_h3_resolution_10():
    # ~76 m edges: fine enough for Landsat's 100 m thermal pixels without false precision.
    assert RESOLUTION == 10


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


# --- Square tiles (SPEC-square-grid) ---

import geopandas as gpd  # noqa: E402
from shapely.geometry import box  # noqa: E402

from coolboston.grid import CELL_SIZE_M, GRID_CRS, square_tiles, tile_coordinates, tile_id  # noqa: E402


def to_wgs84(geom):
    return gpd.GeoSeries([geom], crs=GRID_CRS).to_crs(4326).iloc[0]


# 250.5 m x 150 m in State Plane: columns 2299 (0.5 m wide sliver), 2300, 2301, 2302 (50 m);
# rows 9000 (80 m) and 9001 (70 m).
RECT = box(229_999.5, 900_020, 230_250, 900_170)


def test_tile_ids_are_i_underscore_j():
    assert tile_id(2300, 9001) == "2300_9001"
    assert tile_id(-3, 7) == "-3_7"


def test_rectangle_gives_expected_tiles_and_clipped_areas():
    tiles = square_tiles(to_wgs84(RECT))

    areas = dict(zip(tiles.id, tiles.land_area_m2))
    expected = {
        "2300_9000": 8000, "2300_9001": 7000,
        "2301_9000": 8000, "2301_9001": 7000,
        "2302_9000": 4000, "2302_9001": 3500,
    }
    assert sorted(areas) == sorted(expected)  # 0.5 m column (40 and 35 m²) dropped as slivers
    for k, v in expected.items():
        assert areas[k] == pytest.approx(v, rel=1e-3)
    assert list(tiles.id) == sorted(expected, key=lambda t: tuple(map(int, t.split("_"))))
    assert tiles.crs.to_epsg() == GRID_CRS


def test_full_tile_is_100_m_square():
    tiles = square_tiles(to_wgs84(box(230_000, 900_000, 230_100, 900_100).buffer(-0.01)))
    assert list(tiles.id) == ["2300_9000"]
    assert tiles.land_area_m2.iloc[0] == pytest.approx(CELL_SIZE_M**2, rel=1e-3)


def test_tile_split_by_water_is_multipart_with_full_land_area():
    land = MultiPolygon([box(230_000, 900_000, 230_040, 900_100), box(230_060, 900_000, 230_100, 900_100)])
    tiles = square_tiles(to_wgs84(land.buffer(-0.01)))
    assert list(tiles.id) == ["2300_9000"]
    assert tiles.land_area_m2.iloc[0] == pytest.approx(8000, rel=1e-3)
    (coords,) = tile_coordinates(tiles)
    assert len(coords) == 2


def test_coordinates_are_closed_lnglat_rounded_and_ccw():
    tiles = square_tiles(to_wgs84(RECT))
    for polys in tile_coordinates(tiles):
        for rings in polys:
            ext = rings[0]
            assert ext[0] == ext[-1] and len(ext) >= 4
            for lng, lat in ext:
                assert -71.2 < lng < -70.9 and 42.2 < lat < 42.5
                assert round(lng, 6) == lng and round(lat, 6) == lat
            assert Polygon(ext).exterior.is_ccw
