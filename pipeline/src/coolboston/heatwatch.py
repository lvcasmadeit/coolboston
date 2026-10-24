"""2019 Heat Watch (CAPA / Museum of Science) hex means -> our H3 grid.

Source: "Canopy Change Assessment: Heat Metrics", HEX Mean Heat Index layer (City of Boston,
published on MassGIS). 682 hexagons of ~25 ha with July 2019 mean air temperature (°F) at
6am, 3pm and 7pm; the app uses 3pm only. Hexes outside the traverse routes are stored as 0, which we treat as missing.
"""

from pathlib import Path
from urllib.request import urlretrieve

import geopandas as gpd
import numpy as np
import pandas as pd

from coolboston.grid import RAW_DIR
from coolboston.join import area_weighted_mean, area_weighted_mean_onto

HEATWATCH_URL = (
    "https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Heat_Metrics/"
    "FeatureServer/2/query?where=1%3D1&outFields=GRID_ID,Mean_p2_T_"
    "&outSR=4326&f=geojson"
)
HEATWATCH_PATH = RAW_DIR / "heatwatch_hex.geojson"

# Source field -> our name. "p2" is the 3pm traverse.
SOURCE_FIELDS = {"Mean_p2_T_": "temp_3pm"}
TEMP_COLUMNS = tuple(SOURCE_FIELDS.values())


def fetch_heatwatch(path: Path = HEATWATCH_PATH) -> Path:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        urlretrieve(HEATWATCH_URL, path)
    return path


def load_heatwatch(path: Path) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(path).rename(columns=SOURCE_FIELDS)
    gdf = gdf[[*TEMP_COLUMNS, "geometry"]]
    # No plausible Boston summer air temperature is <= 0 °F; those are unsampled hexes.
    gdf[list(TEMP_COLUMNS)] = gdf[list(TEMP_COLUMNS)].where(gdf[list(TEMP_COLUMNS)] > 0, np.nan)
    return gdf


def heatwatch_for_cells(cells: list[str]) -> pd.DataFrame:
    return area_weighted_mean(cells, load_heatwatch(fetch_heatwatch()), list(TEMP_COLUMNS))


def heatwatch_for_tiles(tiles: gpd.GeoDataFrame) -> pd.DataFrame:
    """Area-weighted Heat Watch means over each tile's land polygon (no interpolation)."""
    return area_weighted_mean_onto(tiles.set_index("id")[["geometry"]], load_heatwatch(fetch_heatwatch()), list(TEMP_COLUMNS))
