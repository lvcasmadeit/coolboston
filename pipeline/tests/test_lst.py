import math

import numpy as np

from coolboston.lst import MASK_BITS, celsius_to_f, cloud_mask, dn_to_celsius, masked_celsius


def test_dn_44000_is_about_26_24_c():
    assert math.isclose(float(dn_to_celsius(np.array([44000]))[0]), 26.24, abs_tol=0.005)


def test_dn_zero_is_nan():
    out = dn_to_celsius(np.array([0, 44000], dtype=np.uint16))
    assert math.isnan(out[0]) and not math.isnan(out[1])


def test_mask_flags_exactly_the_masked_bits():
    clear = 1 << 6  # "clear" bit only
    water = 1 << 7
    qa = np.array([clear, water] + [clear | (1 << b) for b in MASK_BITS] + [1 << 5], dtype=np.uint16)

    mask = cloud_mask(qa)

    # clear, water and snow (bit 5) stay; fill, dilated cloud, cirrus, cloud and shadow are masked
    assert mask.tolist() == [False, False] + [True] * len(MASK_BITS) + [False]


def test_masked_pixels_become_nan():
    dn = np.array([[44000, 44000], [44000, 0]], dtype=np.uint16)
    qa = np.array([[1 << 6, 1 << 3], [1 << 6, 1 << 6]], dtype=np.uint16)

    out = masked_celsius(dn, qa)

    assert np.isnan(out).tolist() == [[False, True], [False, True]]


def test_celsius_to_f():
    assert celsius_to_f(np.array([0.0, 100.0])).tolist() == [32.0, 212.0]
