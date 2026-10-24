"""Landsat Collection 2 Level-2 scene search on Microsoft Planetary Computer (STAC).

Timing: Landsat 7, 8 and 9 cross the equator at about 10:00-10:12 a.m. local solar time
(descending node, USGS/NASA). Over Boston the 2019 scenes were acquired at 15:13-15:27 UTC,
about 11:15 a.m. EDT. Surface temperatures from these scenes are MID-MORNING values; never
present them as 3pm values next to the Heat Watch air temperatures.
"""

import json
from dataclasses import dataclass
from urllib.request import Request, urlopen

STAC_SEARCH_URL = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
SAS_TOKEN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/landsat-c2-l2"
COLLECTION = "landsat-c2-l2"

# City of Boston boundary bounds (grid.load_boundary), rounded outward. (west, south, east, north)
BOSTON_BBOX = (-71.1912, 42.2278, -70.9233, 42.3971)
MAX_CLOUD_COVER = 20

# Surface temperature (ST_B6 on Landsat 7, ST_B10 on Landsat 8/9) and the pixel QA band.
# Asset keys checked on live items 2026-10-24: Landsat 7 items expose "lwir", Landsat 8 "lwir11".
THERMAL_ASSET = {"landsat-7": "lwir", "landsat-8": "lwir11", "landsat-9": "lwir11"}
QA_ASSET = "qa_pixel"


@dataclass(frozen=True)
class Scene:
    id: str
    platform: str
    datetime: str
    cloud_cover: float
    thermal_href: str
    qa_href: str


def build_query(
    year: int,
    bbox: tuple[float, float, float, float] = BOSTON_BBOX,
    max_cloud: float = MAX_CLOUD_COVER,
) -> dict:
    """STAC search body for June 1 - August 31 of `year` with scene cloud cover below `max_cloud`."""
    return {
        "collections": [COLLECTION],
        "bbox": list(bbox),
        "datetime": f"{year}-06-01T00:00:00Z/{year}-08-31T23:59:59Z",
        "query": {"eo:cloud_cover": {"lt": max_cloud}},
        "limit": 100,
    }


def parse_scenes(feature_collection: dict) -> list[Scene]:
    """STAC items -> scenes, oldest first. Items from platforms without a known thermal key are skipped."""
    scenes = []
    for f in feature_collection["features"]:
        p = f["properties"]
        thermal = THERMAL_ASSET.get(p["platform"])
        if thermal is None or thermal not in f["assets"] or QA_ASSET not in f["assets"]:
            continue
        scenes.append(
            Scene(
                id=f["id"],
                platform=p["platform"],
                datetime=p["datetime"],
                cloud_cover=p["eo:cloud_cover"],
                thermal_href=f["assets"][thermal]["href"],
                qa_href=f["assets"][QA_ASSET]["href"],
            )
        )
    return sorted(scenes, key=lambda s: s.datetime)


def sign(href: str, token: str) -> str:
    return f"{href}?{token}"


def _get_json(url: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode()
    req = Request(url, data=data, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=60) as r:
        return json.load(r)


def search_scenes(year: int) -> list[Scene]:
    """Live search; hrefs are signed with a short-lived Planetary Computer SAS token."""
    scenes = parse_scenes(_get_json(STAC_SEARCH_URL, build_query(year)))
    token = _get_json(SAS_TOKEN_URL)["token"]
    return [
        Scene(**{**s.__dict__, "thermal_href": sign(s.thermal_href, token), "qa_href": sign(s.qa_href, token)})
        for s in scenes
    ]


if __name__ == "__main__":
    found = search_scenes(2019)
    print(f"{len(found)} scenes, summer 2019, cloud < {MAX_CLOUD_COVER}%")
    for s in found:
        print(f"  {s.id}  {s.platform}  {s.datetime}  cloud {s.cloud_cover}")
