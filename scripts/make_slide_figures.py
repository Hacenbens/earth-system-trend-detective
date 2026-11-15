"""Clean, large-type figures for the presentation deck (same data as the analysis figures).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md. Each slide carries the visible AI note in its
source line (Space Apps SI policy); these PNGs are plots of NASA/ESA-JAXA/CHC data, not generated imagery.
Output: outputs/slides/*.png
"""
import glob
import sys
from pathlib import Path

import h5py
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import xarray as xr
from matplotlib.colors import BoundaryNorm, ListedColormap

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
OUT = ROOT / "outputs" / "slides"; OUT.mkdir(parents=True, exist_ok=True)
INK, MUTED, SAND, TEAL, OCHRE = "#13233A", "#5B6B7F", "#F3F5F2", "#0F8B8D", "#C27C1E"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 22, "axes.edgecolor": MUTED, "axes.labelcolor": INK,
                     "xtick.color": MUTED, "ytick.color": MUTED, "savefig.facecolor": SAND, "axes.facecolor": SAND})
ds = xr.open_dataset(ROOT / "data" / "raw" / "imerg_jjas_percell_1998_2025.nc").load()
YEARS = ds.year.values


def save(fig, name):
    fig.savefig(OUT / name, dpi=110, bbox_inches="tight", pad_inches=0.15)
    plt.close(fig)
    print("wrote", name)


def borders(ax, labels=True, color=INK):
    for x in (-5, 10):
        ax.axvline(x, color=color, lw=1.6, ls=(0, (6, 4)), alpha=0.8)
    if labels:
        for x, t in ((-11.5, "WEST"), (2.5, "CENTRAL"), (15, "EAST")):
            ax.text(x, 19.2, t, ha="center", va="top", fontsize=22, color=color, weight="bold", alpha=0.85)


# 1. cover / study area: mean JJAS rainfall with sub-regions
m = ds.total.mean("year").coarsen(lat=2, lon=2, boundary="trim").mean()
fig, ax = plt.subplots(figsize=(16, 4.6))
im = ax.pcolormesh(m.lon, m.lat, m, cmap="YlGnBu", vmin=0, vmax=1100, shading="nearest")
borders(ax); ax.set_xticks([-15, -10, -5, 0, 5, 10, 15, 20]); ax.set_yticks([10, 15, 20])
ax.set_xticklabels(["15°W", "10°W", "5°W", "0°", "5°E", "10°E", "15°E", "20°E"]); ax.set_yticklabels(["10°N", "15°N", "20°N"])
cb = fig.colorbar(im, ax=ax, pad=0.01, fraction=0.03); cb.set_label("mm per season", fontsize=20)
save(fig, "study_area_rainfall.png")

# 2. EOF2 east-west see-saw map (from the EOF analysis, recomputed here identically)
f = ds.total.coarsen(lat=5, lon=5, boundary="trim").mean()
z = (f - f.mean("year")) / f.std("year", ddof=1)
X = (z * np.sqrt(np.cos(np.deg2rad(f.lat)))).values.reshape(len(YEARS), -1)
U, S, Vt = np.linalg.svd(X, full_matrices=False)
pc2 = U[:, 1] * S[1]; pc2 = (pc2 - pc2.mean()) / pc2.std(ddof=1)
zz = z.values.reshape(len(YEARS), -1)
corr = np.array([np.corrcoef(pc2, zz[:, j])[0, 1] for j in range(zz.shape[1])])
if np.nanmean(corr) < 0:
    corr = -corr
corr = -corr  # show east positive (wetting side) in teal
cm = corr.reshape(f.sizes["lat"], f.sizes["lon"])
fig, ax = plt.subplots(figsize=(13, 4.6))
ax.pcolormesh(f.lon, f.lat, cm, cmap="BrBG", vmin=-0.8, vmax=0.8, shading="gouraud")
borders(ax); ax.set_xticks([]); ax.set_yticks([])
for s in ax.spines.values():
    s.set_visible(False)
save(fig, "eof2_seesaw.png")

# 3. EarthCARE east storm: classification curtain (top panel only, large labels)
GROUPS = [([-1, 1, 7], "#EEF1EE"), ([0], "#7A5C3A"), ([5, 6], "#0B2E5C"), ([2, 10, 11], "#2B7BB9"), ([8, 9, 18], "#9CC8E2"),
          ([3, 12, 13, 14, 15, 16, 17], "#6A51A3"), ([4, 19, 20, 21, 22], "#C9C6E3"), ([26, 30, 31], OCHRE),
          ([27, 28, 29, 32, 33, 34], "#A9A9A9"), ([25], "#EEF1EE")]
code2 = {c: i for i, (cs, _) in enumerate(GROUPS) for c in cs}
fn = glob.glob(str(ROOT / "data" / "raw" / "earthcare" / "*AC__TC__2B*01495A*"))[0]
with h5py.File(fn) as h:
    lat = h["ScienceData/latitude"][:]; hgt = h["ScienceData/height"][:] / 1000
    cls = h["ScienceData/synergetic_target_classification_medium_resolution"][:].astype(int)
hgt = np.where(np.abs(hgt) > 1e3, np.nan, hgt); hgt = np.where(np.isfinite(hgt), hgt, np.nanmedian(hgt, axis=0))
seg = (lat >= 9) & (lat <= 21.5)
g = np.vectorize(lambda v: code2.get(v, 0))(cls[seg])
g = np.where((g == 7) & (hgt[seg] > 8), 6, g)  # 'dust' above 8 km = misclassified ice (artefact, see E-012)
fig, ax = plt.subplots(figsize=(16, 6.2))
ax.pcolormesh(np.repeat(lat[seg][:, None], hgt.shape[1], 1), hgt[seg], g,
              cmap=ListedColormap([c for _, c in GROUPS]), norm=BoundaryNorm(np.arange(-0.5, len(GROUPS)), len(GROUPS)), shading="nearest")
ax.set_ylim(0, 18); ax.set_xlim(9, 21.5); ax.set_ylabel("height (km)"); ax.set_xlabel("latitude (°N), along the satellite track at ~14.6°E")
ax.axhline(4.7, color=INK, lw=1.2, ls=(0, (6, 4)))
save(fig, "earthcare_storm_east.png")

# 4. wet minus dry: column water vapour + moisture-transport arrows
R = ROOT / "data" / "raw" / "merra2_box"
mer = xr.merge([xr.open_dataset(R / "M2TMNXSLV_1998_2025.nc")[["TQV"]], xr.open_dataset(R / "M2TMNXINT_1998_2025.nc")[["UFLXQV", "VFLXQV"]]]).load()
mer = mer.sel(time=mer.time.dt.month.isin([6, 7, 8, 9])).groupby("time.year").mean()
box = ds.total.weighted(np.cos(np.deg2rad(ds.lat))).mean(("lat", "lon")).to_series()
det = box - np.polyval(np.polyfit(box.index, box.values, 1), box.index)
wet, dry = det.sort_values().index[-9:], det.sort_values().index[:9]
d = mer.sel(year=list(wet)).mean("year") - mer.sel(year=list(dry)).mean("year")
fig, ax = plt.subplots(figsize=(16, 5))
im = ax.pcolormesh(d.lon, d.lat, d.TQV, cmap="BrBG", vmin=-4.5, vmax=4.5, shading="gouraud")
ax.quiver(d.lon[::4], d.lat[::3], d.UFLXQV[::3, ::4], d.VFLXQV[::3, ::4], color=INK, width=0.0028, scale=900, alpha=0.85)
borders(ax); ax.set_xticks([-15, -10, -5, 0, 5, 10, 15, 20]); ax.set_yticks([10, 15, 20])
ax.set_xticklabels(["15°W", "10°W", "5°W", "0°", "5°E", "10°E", "15°E", "20°E"]); ax.set_yticklabels(["10°N", "15°N", "20°N"])
cb = fig.colorbar(im, ax=ax, pad=0.01, fraction=0.03); cb.set_label("kg/m² (wet − dry)", fontsize=20)
save(fig, "wet_dry_moisture.png")
print("wet years", list(wet), "dry years", list(dry))
