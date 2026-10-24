import math

import h3
import numpy as np
from affine import Affine

from coolboston.grid import RESOLUTION
from coolboston.zonal import pixel_cells, zonal_mean

NAN = math.nan


def test_zonal_mean_uses_only_valid_pixels_and_none_for_empty_cells():
    values = np.array([[1.0, 3.0, NAN], [NAN, 10.0, NAN]])
    cells = np.array([["a", "a", "a"], ["b", "c", "c"]], dtype=object)

    out = zonal_mean(values, cells, ["a", "b", "c", "d"])

    assert out == {"a": 2.0, "b": None, "c": 10.0, "d": None}


def test_pixel_cells_assigns_pixel_centres():
    # 2x2 grid of 0.0001° pixels in WGS84 around downtown Boston
    t = Affine(0.0001, 0, -71.0590, 0, -0.0001, 42.3602)

    cells = pixel_cells(t, (2, 2), 4326)

    assert cells.shape == (2, 2)
    assert cells[0, 0] == h3.latlng_to_cell(42.36015, -71.05895, RESOLUTION)


def test_pixel_tiles_assigns_centres_to_tile_land_only():
    from shapely.geometry import box

    from coolboston.grid import GRID_CRS, square_tiles
    from coolboston.zonal import pixel_tiles
    import geopandas as gpd

    land = box(229_999.5, 900_020, 230_250, 900_170)
    tiles = square_tiles(gpd.GeoSeries([land], crs=GRID_CRS).to_crs(4326).iloc[0])
    # One row of 30 m pixels in State Plane along y = 900_050 (row 9000), centres at x = 229_985 + 30k.
    t = Affine(30, 0, 229_970, 0, -30, 900_065)

    ids = pixel_tiles(t, (1, 11), GRID_CRS, tiles)[0]

    # 229_985: outside land; 230_015..230_075: tile 2300; 230_105..230_195: 2301;
    # 230_225: 2302 on land; 230_255, 230_285: tile 2302 exists but the centre is off its land.
    assert list(ids) == [None, "2300_9000", "2300_9000", "2300_9000", "2301_9000", "2301_9000",
                         "2301_9000", "2301_9000", "2302_9000", None, None]


def test_zonal_mean_ignores_pixels_outside_tiles():
    values = np.array([[5.0, 7.0]])
    cells = np.array([[None, "t"]], dtype=object)
    assert zonal_mean(values, cells, ["t"]) == {"t": 7.0}


def test_tile_surface_mean_falls_back_to_full_square_for_tiles_without_land_pixels():
    from shapely.geometry import box

    from coolboston.grid import GRID_CRS, square_tiles
    from coolboston.zonal import tile_surface_mean
    import geopandas as gpd

    # Tile 2300_9000 has land only in x < 230_010 (1,000 m²): no 30 m pixel centre lands on it.
    land = box(230_000, 900_000, 230_010, 900_100)
    tiles = square_tiles(gpd.GeoSeries([land], crs=GRID_CRS).to_crs(4326).iloc[0])
    t = Affine(30, 0, 230_000, 0, -30, 900_090)  # centres x = 230_015, 230_045, 230_075
    values = np.array([[80.0, 90.0, NAN]])

    assert tile_surface_mean(values, t, GRID_CRS, tiles) == {"2300_9000": 85.0}
