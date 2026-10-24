import math

import numpy as np
import pytest

from coolboston.composite import CompositeError, nan_median

NAN = math.nan


def test_median_ignores_nan_and_keeps_all_nan_pixels_nan():
    a = np.array([[1.0, NAN], [5.0, NAN]])
    b = np.array([[3.0, 2.0], [NAN, NAN]])
    c = np.array([[2.0, 4.0], [7.0, NAN]])

    out = nan_median([a, b, c], 2019)

    assert out[0, 0] == 2.0
    assert out[0, 1] == 3.0  # median of 2, 4
    assert out[1, 0] == 6.0  # median of 5, 7
    assert math.isnan(out[1, 1])


def test_fewer_than_two_usable_scenes_raises_with_year():
    good = np.array([[1.0]])
    empty = np.array([[NAN]])

    with pytest.raises(CompositeError, match="2019"):
        nan_median([good, empty, empty], 2019)


def test_mismatched_grids_raise():
    with pytest.raises(CompositeError):
        nan_median([np.ones((2, 2)), np.ones((3, 3))], 2019)
