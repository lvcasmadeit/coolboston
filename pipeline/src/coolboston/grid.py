"""Boston boundary -> H3 resolution-9 cell IDs (the grid every other dataset is joined onto)."""

from pathlib import Path
from urllib.request import urlretrieve

import geopandas as gpd
import h3
from shapely.geometry.base import BaseGeometry

RESOLUTION = 9

# City of Boston Outline Boundary (Water Excluded), City of Boston GIS / Analyze Boston.
BOUNDARY_URL = (
    "https://gis.boston.gov/ArcGIS/rest/services/CityServices/COBBoundary/MapServer/0/query"
    "?where=1%3D1&outFields=*&outSR=4326&f=geojson"
)
RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw"
BOUNDARY_PATH = RAW_DIR / "boston_boundary.geojson"


def fetch_boundary(path: Path = BOUNDARY_PATH) -> Path:
    """Download the boundary once; later runs reuse the cached file."""
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        urlretrieve(BOUNDARY_URL, path)
    return path


def load_boundary(path: Path) -> BaseGeometry:
    """Read a boundary file as a single WGS84 (lng/lat) geometry."""
    gdf = gpd.read_file(path).to_crs(4326)
    return gdf.geometry.union_all()


def cells_for_geometry(geom: BaseGeometry, resolution: int = RESOLUTION) -> list[str]:
    """Sorted, unique H3 cells whose centers fall inside `geom` (Polygon or MultiPolygon)."""
    return sorted(set(h3.geo_to_cells(geom, resolution)))


def boston_cells() -> list[str]:
    return cells_for_geometry(load_boundary(fetch_boundary()))


if __name__ == "__main__":
    cells = boston_cells()
    print(f"{len(cells)} H3 res-{RESOLUTION} cells cover Boston")
