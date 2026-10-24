from coolboston.landsat import (
    BOSTON_BBOX,
    QA_ASSET,
    THERMAL_ASSET,
    build_query,
    parse_scenes,
    sign,
)
from coolboston.grid import BOUNDARY_PATH, load_boundary


def _item(id_, platform, dt, assets):
    return {
        "id": id_,
        "properties": {"platform": platform, "datetime": dt, "eo:cloud_cover": 5.0},
        "assets": {k: {"href": f"https://x/{id_}/{k}.tif"} for k in assets},
    }


def test_query_covers_summer_with_cloud_filter():
    q = build_query(2019)

    assert q["collections"] == ["landsat-c2-l2"]
    assert q["datetime"] == "2019-06-01T00:00:00Z/2019-08-31T23:59:59Z"
    assert q["query"] == {"eo:cloud_cover": {"lt": 20}}
    assert q["bbox"] == list(BOSTON_BBOX)


def test_bbox_contains_boston_boundary():
    if not BOUNDARY_PATH.exists():  # raw data is gitignored; skip on a fresh clone
        return
    w, s, e, n = load_boundary(BOUNDARY_PATH).bounds
    bw, bs, be, bn = BOSTON_BBOX
    assert bw <= w and bs <= s and be >= e and bn >= n


def test_thermal_keys_per_platform():
    assert THERMAL_ASSET["landsat-7"] == "lwir"
    assert THERMAL_ASSET["landsat-8"] == "lwir11"
    assert QA_ASSET == "qa_pixel"


def test_parse_picks_platform_thermal_key_sorts_and_skips_unknown():
    fc = {
        "features": [
            _item("L8", "landsat-8", "2019-06-04T15:26:52Z", ["lwir11", "qa_pixel"]),
            _item("L7", "landsat-7", "2019-06-01T15:16:00Z", ["lwir", "qa_pixel"]),
            _item("L5", "landsat-5", "2019-06-02T15:00:00Z", ["lwir", "qa_pixel"]),
            _item("noqa", "landsat-8", "2019-06-03T15:00:00Z", ["lwir11"]),
        ]
    }

    scenes = parse_scenes(fc)

    assert [s.id for s in scenes] == ["L7", "L8"]
    assert scenes[0].thermal_href.endswith("/L7/lwir.tif")
    assert scenes[1].thermal_href.endswith("/L8/lwir11.tif")
    assert scenes[1].qa_href.endswith("/L8/qa_pixel.tif")


def test_sign_appends_token():
    assert sign("https://a/b.tif", "st=1&sig=2") == "https://a/b.tif?st=1&sig=2"
