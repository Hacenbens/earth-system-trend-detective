"""MERRA-2 monthly box fields through NASA OPeNDAP (Layer 2: moisture, circulation, dust).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

MERRA-2 is a REANALYSIS (model + assimilated observations), not a direct satellite measurement; label it as such.
Grid 0.5 deg lat x 0.625 deg lon, cell centres lat -90..90 (361), lon -180..179.375 (576); dims (time, lat, lon).
"""
import io
import time
from concurrent.futures import ThreadPoolExecutor

import earthaccess
import numpy as np
import pandas as pd
import xarray as xr

from .auth import https_session

SAHEL = {"lat": (10.0, 20.0), "lon": (-18.0, 20.0)}  # D-003b (provisional)

# product -> variables we use (all monthly means, 2-D)
PRODUCTS = {
    "M2TMNXSLV": ["TQV", "QV2M", "T2M", "OMEGA500", "U850", "V850"],   # single-level diagnostics
    "M2TMNXINT": ["UFLXQV", "VFLXQV", "DQVDT_DYN"],                     # vertically integrated moisture budget
    "M2TMNXAER": ["DUEXTTAU", "DUCMASS", "DUSMASS", "TOTEXTTAU"],       # aerosol / dust
    "M2TMNXLND": ["GWETTOP", "GWETROOT", "EVLAND", "LHLAND", "SHLAND", "LAI", "TSOIL1"],   # land surface (land cells only)
    "M2IMNPASM": ["U@3:14", "V@3:14"],                                   # winds on pressure levels 925..600 hPa (lev index 3..14)
}


def _index(box):
    la0, la1 = round((box["lat"][0] + 90) / 0.5), round((box["lat"][1] + 90) / 0.5)
    lo0, lo1 = round((box["lon"][0] + 180) / 0.625), round((box["lon"][1] + 180) / 0.625)
    return (la0, la1), (lo0, lo1)


def box_month(session, granule, variables, box=SAHEL, retries=4):
    (la0, la1), (lo0, lo1) = _index(box)
    parts, levs = [], None
    for v in variables:   # "NAME" (2-D) or "NAME@k0:k1" (3-D, pressure-level indices k0..k1)
        if "@" in v:
            name, rng = v.split("@"); k0, k1 = rng.split(":"); levs = (k0, k1)
            parts.append(f"/{name}[0:1:0][{k0}:1:{k1}][{la0}:1:{la1}][{lo0}:1:{lo1}]")
        else:
            parts.append(f"/{v}[0:1:0][{la0}:1:{la1}][{lo0}:1:{lo1}]")
    extra = [f"/lev[{levs[0]}:1:{levs[1]}]"] if levs else []
    ce = ";".join(parts + extra + [f"/lat[{la0}:1:{la1}]", f"/lon[{lo0}:1:{lo1}]", "/time"])
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
    ds = xr.open_dataset(io.BytesIO(r.content), engine="h5netcdf").load()
    assert abs(float(ds.lat.min()) - box["lat"][0]) < 0.3 and abs(float(ds.lon.max()) - box["lon"][1]) < 0.35
    t = pd.Timestamp(str(ds["time"].values[0])[:7] + "-01")
    return ds.assign_coords(time=[t])


def fetch_product(short_name, start, end, box=SAHEL, workers=8):
    """All monthly granules of one product as one Dataset (time, lat, lon). Duplicate months keep the last stream."""
    s = https_session()
    gr = earthaccess.search_data(short_name=short_name, temporal=(start, end))
    with ThreadPoolExecutor(workers) as ex:
        parts = list(ex.map(lambda g: box_month(s, g, PRODUCTS[short_name], box), gr))
    ds = xr.concat(parts, dim="time").sortby("time")
    _, keep = np.unique(ds.time.values, return_index=True)
    return ds.isel(time=np.sort(keep))


def area_mean(ds, lon_range=None, lat_range=None):
    """cos(lat)-weighted mean over the box or a sub-box; returns a DataFrame indexed by month."""
    sub = ds
    if lon_range:
        sub = sub.sel(lon=slice(*lon_range))
    if lat_range:
        sub = sub.sel(lat=slice(*lat_range))
    w = np.cos(np.deg2rad(sub.lat))
    return sub.weighted(w).mean(("lat", "lon")).to_dataframe().drop(columns=[c for c in ("lat", "lon") if c in sub.coords and c in sub.to_dataframe().columns], errors="ignore")
