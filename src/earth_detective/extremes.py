"""ETCCDI-style extreme-precipitation indices from daily fields (time x lat x lon, mm/day), computed PER GRID CELL.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Wet day = >= 1 mm. Indices for one season (pass only that season's days):
  PRCPTOT  total on wet days (mm)               R10mm / R20mm  days >= 10 / 20 mm
  Rx1day   max 1-day amount (mm)                Rx5day         max 5-day running total (mm)
  SDII     PRCPTOT / wet days (mm/day)          wet_days       days >= 1 mm
  CDD      max consecutive dry days (< 1 mm)
  R95p     total on days above the cell's 95th percentile of wet-day amounts in the reference period (mm)
  R95pTOT  100 * R95p / PRCPTOT (%)
Box values are cos(lat)-weighted means of the per-cell indices (NOT indices of the box-mean series).
Note: ETCCDI uses a fixed base period for R95p; we use the whole analysis period 1998-2025 as reference and say so.
"""
import numpy as np
import xarray as xr

WET = 1.0


def wet_day_p95(daily: xr.DataArray) -> xr.DataArray:
    """Per-cell 95th percentile of wet-day amounts over all days given (the reference period)."""
    return daily.where(daily >= WET).quantile(0.95, dim="time", skipna=True).drop_vars("quantile")


def _cdd(daily: xr.DataArray) -> xr.DataArray:
    dry = (daily < WET).fillna(False).values
    run = np.zeros(dry.shape[1:], dtype=np.int32)
    best = np.zeros_like(run)
    for t in range(dry.shape[0]):
        run = (run + 1) * dry[t]
        np.maximum(best, run, out=best)
    return xr.DataArray(best, coords={k: daily.coords[k] for k in daily.dims[1:]}, dims=daily.dims[1:])


def season_indices(daily: xr.DataArray, p95: xr.DataArray | None = None) -> xr.Dataset:
    """Per-cell indices for one season of daily data."""
    wet = daily >= WET
    prcptot = daily.where(wet, 0).sum("time")
    nwet = wet.sum("time")
    out = xr.Dataset({
        "PRCPTOT": prcptot,
        "wet_days": nwet,
        "SDII": prcptot / nwet.where(nwet > 0),
        "Rx1day": daily.max("time"),
        "Rx5day": daily.rolling(time=5).sum().max("time"),
        "R10mm": (daily >= 10).sum("time"),
        "R20mm": (daily >= 20).sum("time"),
        "CDD": _cdd(daily),
    })
    if p95 is not None:
        r95p = daily.where(daily > p95, 0).sum("time")
        out["R95p"] = r95p
        out["R95pTOT"] = 100 * r95p / prcptot.where(prcptot > 0)
    return out


def box_average(ds: xr.Dataset) -> dict:
    """cos(lat)-weighted box mean of each per-cell index."""
    w = np.cos(np.deg2rad(ds["lat"]))
    return {k: float(v.astype("float64").weighted(w).mean(("lat", "lon"), skipna=True)) for k, v in ds.data_vars.items()}
