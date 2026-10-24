"""Landsat Collection 2 Level-2 surface temperature: DN -> °C, plus the QA_PIXEL cloud mask.

Scale and offset, and the QA_PIXEL bit layout, are from the USGS Landsat 8-9 Collection 2
Level-2 Science Product Guide (LSDS-1619) and the Landsat 4-7 guide (LSDS-1618); both use the
same values for the ST band and the same QA_PIXEL bits 0-4.
https://www.usgs.gov/landsat-missions/landsat-collection-2-level-2-science-products
"""

import numpy as np

ST_SCALE = 0.00341802
ST_OFFSET_K = 149.0
KELVIN = 273.15

# QA_PIXEL bits set when a pixel is unusable for surface temperature.
QA_FILL = 0
QA_DILATED_CLOUD = 1
QA_CIRRUS = 2  # Landsat 8/9 only; always 0 on Landsat 7
QA_CLOUD = 3
QA_CLOUD_SHADOW = 4
MASK_BITS = (QA_FILL, QA_DILATED_CLOUD, QA_CIRRUS, QA_CLOUD, QA_CLOUD_SHADOW)
_MASK = sum(1 << b for b in MASK_BITS)


def dn_to_celsius(dn: np.ndarray) -> np.ndarray:
    """ST digital numbers -> °C. DN 0 is the fill value and becomes NaN."""
    dn = np.asarray(dn)
    out = dn.astype(np.float64) * ST_SCALE + ST_OFFSET_K - KELVIN
    return np.where(dn == 0, np.nan, out)


def cloud_mask(qa: np.ndarray) -> np.ndarray:
    """True where the pixel is fill, dilated cloud, cirrus, cloud or cloud shadow."""
    return (np.asarray(qa).astype(np.uint16) & _MASK) != 0


def masked_celsius(dn: np.ndarray, qa: np.ndarray) -> np.ndarray:
    """°C with masked and fill pixels set to NaN."""
    c = dn_to_celsius(dn)
    return np.where(cloud_mask(qa), np.nan, c)


def celsius_to_f(c):
    return np.asarray(c) * 9 / 5 + 32
