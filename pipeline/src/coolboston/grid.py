"""Boston boundary -> the grid every other dataset is joined onto.

Square tiles (SPEC-square-grid): 100 m squares in Massachusetts State Plane (EPSG:26986, metres),
origin snapped to 100 m. Tile (i, j) covers x in [100i, 100i+100), y in [100j, 100j+100); id "{i}_{j}".
Tiles are clipped to the land boundary; slivers under MIN_LAND_M2 are dropped.

The H3 res-10 functions below are the previous grid, kept until the pipeline switches over (Task 41).
"""

from pathlib import Path
from urllib.request import urlretrieve

import math

import geopandas as gpd
import h3
import numpy as np
import shapely
from shapely.geometry import MultiPolygon, Polygon
from shapely.geometry.base import BaseGeometry
from shapely.geometry.polygon import orient

RESOLUTION = 10

GRID_CRS = 26986  # NAD83 / Massachusetts Mainland, metres
CELL_SIZE_M = 100
MIN_LAND_M2 = 100.0  # 1% of a full tile
RING_DECIMALS = 6  # ~0.1 m

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


def tile_id(i: int, j: int) -> str:
    return f"{i}_{j}"


def square_tiles(
    geom: BaseGeometry, size: float = CELL_SIZE_M, min_land_m2: float = MIN_LAND_M2
) -> gpd.GeoDataFrame:
    """Tiles of `geom` (WGS84) clipped to it, in GRID_CRS, sorted by (i, j).

    Columns: id, i, j, land_area_m2, geometry (the clipped tile, GRID_CRS).
    """
    boundary = gpd.GeoSeries([geom], crs=4326).to_crs(GRID_CRS).iloc[0]
    minx, miny, maxx, maxy = boundary.bounds
    ii, jj = np.meshgrid(
        np.arange(math.floor(minx / size), math.ceil(maxx / size)),
        np.arange(math.floor(miny / size), math.ceil(maxy / size)),
        indexing="ij",
    )
    ii, jj = ii.ravel(), jj.ravel()
    boxes = shapely.box(ii * size, jj * size, (ii + 1) * size, (jj + 1) * size)
    hit = shapely.STRtree(boxes).query(boundary, predicate="intersects")
    hit.sort()
    clipped = shapely.intersection(boxes[hit], boundary)
    area = shapely.area(clipped)
    keep = area >= min_land_m2
    i, j = ii[hit][keep], jj[hit][keep]
    return gpd.GeoDataFrame(
        {"id": [tile_id(a, b) for a, b in zip(i, j)], "i": i, "j": j, "land_area_m2": area[keep]},
        geometry=clipped[keep],
        crs=GRID_CRS,
    ).reset_index(drop=True)


def tile_coordinates(tiles: gpd.GeoDataFrame) -> list[list]:
    """Per tile, GeoJSON MultiPolygon coordinates in WGS84 [lng, lat], rounded to RING_DECIMALS.

    MultiPolygon because ~2% of clipped tiles are split by water; holes are kept. Exteriors are
    counter-clockwise (RFC 7946). Rings are closed.
    """
    out = []
    for geom in tiles.to_crs(4326).geometry:
        polys = geom.geoms if isinstance(geom, MultiPolygon) else [geom]
        out.append(
            [
                [[[round(x, RING_DECIMALS), round(y, RING_DECIMALS)] for x, y in ring.coords] for ring in (p.exterior, *p.interiors)]
                for p in (orient(q, 1.0) for q in polys if isinstance(q, Polygon) and not q.is_empty)
            ]
        )
    return out


def boston_tiles() -> gpd.GeoDataFrame:
    return square_tiles(load_boundary(fetch_boundary()))


if __name__ == "__main__":
    tiles = boston_tiles()
    land = gpd.GeoSeries([load_boundary(BOUNDARY_PATH)], crs=4326).to_crs(GRID_CRS).area.iloc[0]
    parts = shapely.get_num_geometries(tiles.geometry.values)
    holes = shapely.get_num_interior_rings(shapely.get_geometry(tiles.geometry.values, 0))
    full = (tiles.land_area_m2 > CELL_SIZE_M**2 - 1).sum()
    print(f"{len(tiles)} tiles of {CELL_SIZE_M} m; {full} full, {(parts > 1).sum()} multipart, {(holes > 0).sum()} with holes")
    print(f"land {tiles.land_area_m2.sum() / 1e6:.3f} km² vs boundary {land / 1e6:.3f} km²")
