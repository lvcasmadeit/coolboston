"""Spatial joins from arbitrary source polygons onto grid cells (square tiles or, until Task 44, H3)."""

import geopandas as gpd
import h3
import pandas as pd
from shapely.geometry import Polygon

# NAD83 / Conus Albers: equal-area, so intersection areas are true areas for weighting.
EQUAL_AREA_CRS = 5070


def cells_to_gdf(cells: list[str]) -> gpd.GeoDataFrame:
    """H3 cell IDs -> WGS84 polygons, indexed by cell ID."""
    geoms = [Polygon([(lng, lat) for lat, lng in h3.cell_to_boundary(c)]) for c in cells]
    return gpd.GeoDataFrame({"cell": cells}, geometry=geoms, crs=4326).set_index("cell")


def area_weighted_mean(
    cells: list[str], sources: gpd.GeoDataFrame, columns: list[str]
) -> pd.DataFrame:
    """H3 cells: see area_weighted_mean_onto."""
    return area_weighted_mean_onto(cells_to_gdf(cells), sources, columns)


def area_weighted_mean_onto(
    targets: gpd.GeoDataFrame, sources: gpd.GeoDataFrame, columns: list[str]
) -> pd.DataFrame:
    """Per target polygon (indexed by id), the mean of each column over overlapping sources,
    weighted by overlap area.

    Null source values don't contribute (their area is dropped from that column's weights).
    Targets with no overlapping, non-null source get NaN for that column, never 0.
    """
    ids = list(targets.index)
    grid = gpd.GeoDataFrame({"cell": ids}, geometry=list(targets.geometry), crs=targets.crs).to_crs(EQUAL_AREA_CRS)
    src = sources[[*columns, "geometry"]].to_crs(EQUAL_AREA_CRS)

    pieces = gpd.overlay(grid, src, how="intersection", keep_geom_type=True)
    pieces["area"] = pieces.geometry.area

    out = pd.DataFrame(index=pd.Index(ids, name="cell"))
    for col in columns:
        valid = pieces[pieces[col].notna()]
        weighted = (valid[col] * valid["area"]).groupby(valid["cell"]).sum()
        total = valid["area"].groupby(valid["cell"]).sum()
        out[col] = (weighted / total).reindex(out.index)
    return out
