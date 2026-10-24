"""Per-pixel summer composite of masked Landsat surface temperature scenes."""

import warnings

import numpy as np

MIN_SCENES = 2


class CompositeError(RuntimeError):
    pass


def usable(scenes: list[np.ndarray]) -> list[np.ndarray]:
    """Scenes with at least one valid (non-NaN) pixel."""
    return [s for s in scenes if np.isfinite(s).any()]


def nan_median(scenes: list[np.ndarray], year: int) -> np.ndarray:
    """Per-pixel median ignoring NaN. All scenes must share one grid.

    Raises CompositeError naming `year` if fewer than MIN_SCENES scenes have any valid pixel.
    Pixels that are NaN in every scene stay NaN.
    """
    good = usable(scenes)
    if len(good) < MIN_SCENES:
        raise CompositeError(
            f"summer {year}: {len(good)} usable Landsat scene(s), need at least {MIN_SCENES}"
        )
    shapes = {s.shape for s in good}
    if len(shapes) != 1:
        raise CompositeError(f"summer {year}: scenes are on different grids {sorted(shapes)}")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # all-NaN pixels -> NaN, expected
        return np.nanmedian(np.stack(good), axis=0)
