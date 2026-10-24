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
