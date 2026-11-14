"""IMERG V07 box-mean extraction through NASA OPeNDAP (only the box is transferred, ~40 kB per granule).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Validated: Final monthly Aug 2024 over the Sahel box = 0.240 mm/hr, same as the full-file computation and Giovanni.
"""
import io
import time
from concurrent.futures import ThreadPoolExecutor

import earthaccess
import numpy as np
import pandas as pd
import xarray as xr

from .auth import https_session

# 0.1 deg grid, cell centres -179.95..179.95 (lon) and -89.95..89.95 (lat); dims are (time, lon, lat)
SAHEL = {"lat": (10.0, 20.0), "lon": (-18.0, 20.0)}  # provisional box, decision D-003b

# product -> (OPeNDAP group, units of `precipitation`)
PRODUCTS = {
    "GPM_3IMERGM": ("Grid", "mm/hr"),     # Final monthly
    "GPM_3IMERGDF": (None, "mm/day"),     # Final daily
    "GPM_3IMERGDL": (None, "mm/day"),     # Late daily (near-real-time, not gauge-calibrated)
}


def _index(box):
    lon0, lon1 = round((box["lon"][0] + 180) / 0.1), round((box["lon"][1] + 180) / 0.1) - 1
    lat0, lat1 = round((box["lat"][0] + 90) / 0.1), round((box["lat"][1] + 90) / 0.1) - 1
    return (lon0, lon1), (lat0, lat1)


def _session():
    return https_session()


def box_field(session, granule, group, box=SAHEL, retries=4):
    """The `precipitation` field over the box for one granule (DataArray lon x lat, NaN for fill), plus its date."""
    (lo0, lo1), (la0, la1) = _index(box)
    pre = f"/{group}" if group else ""
    ce = (f"{pre}/precipitation[0:1:0][{lo0}:1:{lo1}][{la0}:1:{la1}];"
          f"{pre}/lon[{lo0}:1:{lo1}];{pre}/lat[{la0}:1:{la1}];{pre}/time")
    url = next(u["URL"] for u in granule["umm"]["RelatedUrls"] if u.get("Subtype") == "OPENDAP DATA")
    for attempt in range(retries):
        try:
            r = session.get(url + ".dap.nc4", params={"dap4.ce": ce}, timeout=180)
            r.raise_for_status()
            break
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(10 * (attempt + 1))
    ds = xr.open_dataset(io.BytesIO(r.content), engine="h5netcdf", group=group, decode_timedelta=False)
    p = ds["precipitation"].isel(time=0).load()
    assert abs(float(p.lon.min()) - (box["lon"][0] + 0.05)) < 1e-3 and abs(float(p.lat.max()) - (box["lat"][1] - 0.05)) < 1e-3
    return pd.Timestamp(str(ds["time"].values[0])[:10]), p.where(p >= 0)  # fill -9999.9 -> NaN


def box_mean(session, granule, group, box=SAHEL, retries=4):
    """(date, cos-lat weighted mean of `precipitation` over valid cells, n valid cells) for one granule."""
    date, p = box_field(session, granule, group, box, retries)
    w = np.cos(np.deg2rad(p["lat"]))
    return date, float(p.weighted(w).mean(skipna=True)), int(p.notnull().sum())


def series(short_name, start, end, box=SAHEL, workers=8):
    """Box-mean series for one IMERG V07 product: DataFrame(date, rate, valid_cells), rate in the product's units."""
    group, _ = PRODUCTS[short_name]
    s = _session()
    gr = earthaccess.search_data(short_name=short_name, version="07", temporal=(start, end))
    with ThreadPoolExecutor(workers) as ex:
        rows = list(ex.map(lambda g: box_mean(s, g, group, box), gr))
    return pd.DataFrame(rows, columns=["date", "rate", "valid_cells"]).sort_values("date").reset_index(drop=True)
