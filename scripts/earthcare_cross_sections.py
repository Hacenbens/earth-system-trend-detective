"""T-04: EarthCARE vertical cross-sections over the Sahel cases (storm structure, vertical motion, dust layers).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

EarthCARE is an ESA-JAXA mission (CPR by JAXA/NICT, ATLID by ESA). These are CASE STUDIES of present-day processes
(2024-2025), never trends (decisions D-002, D-010).
Inputs (data/raw/earthcare/, scripts/fetch_earthcare.py):
  AC__TC__2B : synergetic (radar+lidar) target classification on a height grid
  CPR_CD__2A : CPR Doppler velocity (best estimate) and sedimentation velocity, quality flag
  ATL_ALD_2A : ATLID aerosol layers (top/base, depolarisation, optical thickness at 355 nm)
Outputs: outputs/earthcare/cross_section_<date>_<orbit>.png, outputs/earthcare/case_metrics.csv
"""
import glob
import warnings
from pathlib import Path

import h5py
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.colors import BoundaryNorm, ListedColormap

warnings.filterwarnings("ignore", category=RuntimeWarning)
ROOT = Path(__file__).resolve().parents[1]
RAW, O = ROOT / "data" / "raw" / "earthcare", ROOT / "outputs" / "earthcare"
LAT = (8.0, 22.0)        # segment shown (box 10-20N plus margins)
FILL = 9e36

CASES = pd.read_csv(O / "shortlist.csv")
CASES = CASES[CASES.orbit.isin([1495, 1340, 6880, 5883])]

# synergetic classes grouped for display
GROUPS = [  # (label, codes, colour)
    ("clear / unknown", [-1, 1, 7], "#f2f2f2"),
    ("ground", [0], "#7a5c3a"),
    ("heavy rain / mixed-phase", [5, 6], "#08306b"),
    ("rain", [2, 10, 11], "#2171b5"),
    ("liquid cloud / drizzle", [8, 9, 18], "#9ecae1"),
    ("snow / melting", [3, 12, 13, 14, 15, 16, 17], "#6a51a3"),
    ("ice cloud", [4, 19, 20, 21, 22], "#cbc9e2"),
    ("dust / dusty mix", [26, 30, 31], "#d95f02"),
    ("smoke / pollution / other aerosol", [27, 28, 29, 32, 33, 34], "#a6a6a6"),
    ("insects", [25], "#e7e1ef"),
]
code2grp = {c: i for i, (_, codes, _) in enumerate(GROUPS) for c in codes}
cmap = ListedColormap([g[2] for g in GROUPS]); norm = BoundaryNorm(np.arange(-0.5, len(GROUPS)), len(GROUPS))
RAIN_CODES, HEAVY_CODES, DUST_CODES = {2, 5, 6, 10, 11}, {5, 6}, {26, 30, 31}
CPR_HYDRO = {2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15}   # CPR_target_classification hydrometeor codes (no clutter/insects)
DUST_MAX_KM = 8.0   # Saharan Air Layer is tropospheric; "dust" near the tropopause over anvils = classification artefact
DOWN_POSITIVE = True  # CPR Doppler sign, verified on the storm cases: median +3.8..+4.3 m/s below 3 km (falling rain)


def read(pattern, names):
    f = glob.glob(str(RAW / pattern))[0]
    with h5py.File(f) as h:
        out = {n: h["ScienceData/" + n][:] for n in names}
    for k, v in out.items():
        if v.dtype.kind == "f":
            out[k] = np.where(np.abs(v) > FILL, np.nan, v)
    return out


def fill_heights(h):
    """Fill missing range-bin heights: first with the bin's median over profiles, then extrapolate empty bins
    from the regular bin spacing."""
    h = np.where(np.isfinite(h), h, np.nanmedian(h, axis=0))
    med = np.nanmedian(h, axis=0)
    ok = np.where(np.isfinite(med))[0]
    step = np.median(np.diff(med[ok]))
    for j in np.where(~np.isfinite(med))[0]:
        k = ok[np.argmin(np.abs(ok - j))]
        h[:, j] = h[:, k] + (j - k) * step
    return h


rows = []
for c in CASES.itertuples():
    tag = f"{c.orbit:05d}{c.frame}"
    tc = read(f"*AC__TC__2B*{tag}*", ["latitude", "longitude", "height", "synergetic_target_classification_medium_resolution", "CPR_target_classification"])
    cd = read(f"*CPR_CD__2A*{tag}*", ["latitude", "height", "doppler_velocity_best_estimate", "sedimentation_velocity_best_estimate", "quality_status"])
    al = read(f"*ATL_ALD_2A*{tag}*", ["latitude", "aerosol_layer_top", "aerosol_layer_base", "aerosol_layer_mean_depolarisation_355nm",
                                       "aerosol_optical_thickness_355nm"])
    seg = (tc["latitude"] >= LAT[0]) & (tc["latitude"] <= LAT[1])
    box = (tc["latitude"] >= 10) & (tc["latitude"] <= 20)
    cls = tc["synergetic_target_classification_medium_resolution"].astype(int)
    hgt = tc["height"] / 1000
    hgt = fill_heights(hgt)

    # --- metrics inside the box (10-20N) ---
    hydro = np.isin(tc["CPR_target_classification"].astype(int), list(CPR_HYDRO))   # radar-detected hydrometeors only
    top = np.where(hydro, hgt, np.nan)
    with np.errstate(all="ignore"):
        echo_top = np.nanmax(top, axis=1)                         # highest hydrometeor per profile (km)
    rain_prof = np.isin(cls, list(RAIN_CODES)).any(1)
    heavy_prof = np.isin(cls, list(HEAVY_CODES)).any(1)
    dust_all = np.isin(cls, list(DUST_CODES))
    dust_high = dust_all & (hgt > 12)                    # artefact flag (anvil tops / tropopause)
    dust_bins = dust_all & (hgt <= DUST_MAX_KM)
    dust_prof = dust_bins.any(1)
    dust_h = np.where(dust_bins, hgt, np.nan)
    # Doppler: check sign convention on rain pixels (falling drops should dominate)
    good = (cd["quality_status"] == 0) & np.isfinite(cd["doppler_velocity_best_estimate"])
    cbox = (cd["latitude"] >= 10) & (cd["latitude"] <= 20)
    dop = np.where(good, cd["doppler_velocity_best_estimate"], np.nan)
    sed = np.where(good, cd["sedimentation_velocity_best_estimate"], np.nan)
    h_cd = cd["height"] / 1000
    h_cd = fill_heights(h_cd)
    low = (h_cd < 3) & cbox[:, None]
    med_low = float(np.nanmedian(dop[low])) if np.isfinite(dop[low]).any() else np.nan
    down_positive = DOWN_POSITIVE
    sign = -1.0 if down_positive else 1.0
    w_air = sign * (dop - sed)           # vertical AIR motion estimate, positive = upward
    w_box = w_air[cbox]
    up99 = float(np.nanpercentile(w_box, 99)) if np.isfinite(w_box).any() else np.nan
    i_up = np.unravel_index(np.nanargmax(np.where(np.isfinite(w_box), w_box, -np.inf)), w_box.shape) if np.isfinite(w_box).any() else None
    # ATLID layers: dust-like = depolarisation > 0.2
    abox = (al["latitude"] >= 10) & (al["latitude"] <= 20)
    dep = al["aerosol_layer_mean_depolarisation_355nm"][abox]
    ltop, lbase = al["aerosol_layer_top"][abox] / 1000, al["aerosol_layer_base"][abox] / 1000
    dusty = dep > 0.2
    rows.append({
        "case": f"{c.date} {c.time_utc} UTC, orbit {c.orbit}{c.frame}", "type": c.case_type, "region": c.region,
        "profiles_in_box": int(box.sum()),
        "rain_profiles_pct": round(100 * rain_prof[box].mean(), 1), "heavy_rain_profiles_pct": round(100 * heavy_prof[box].mean(), 1),
        "radar_echo_top_p95_km_rain_profiles": round(float(np.nanpercentile(echo_top[box & rain_prof], 95)), 1) if (box & rain_prof).any() else np.nan,
        "radar_echo_top_max_km": round(float(np.nanmax(echo_top[box])), 1) if np.isfinite(echo_top[box]).any() else np.nan,
        "doppler_median_below_3km_ms": round(med_low, 2), 
        "updraft_p99_ms": round(up99, 1),
        "updraft_max_ms": round(float(w_box[i_up]), 1) if i_up else np.nan,
        "updraft_max_height_km": round(float(h_cd[cbox][i_up]), 1) if i_up else np.nan,
        "high_level_dust_artefact_pixels": int(dust_high[box].sum()),
        "dust_profiles_pct": round(100 * dust_prof[box].mean(), 1),
        "dust_height_median_km": round(float(np.nanmedian(dust_h[box])), 1) if dust_bins[box].any() else np.nan,
        "dust_height_p90_km": round(float(np.nanpercentile(dust_h[box][np.isfinite(dust_h[box])], 90)), 1) if dust_bins[box].any() else np.nan,
        "dust_with_rain_profiles_pct": round(100 * (dust_prof & rain_prof)[box].mean(), 1),
        "atlid_dusty_layers": int(dusty.sum()),
        "atlid_dusty_layer_top_median_km": round(float(np.nanmedian(ltop[dusty])), 1) if dusty.any() else np.nan,
        "atlid_dusty_layer_base_median_km": round(float(np.nanmedian(lbase[dusty])), 1) if dusty.any() else np.nan,
        "atlid_aot355_median": round(float(np.nanmedian(al["aerosol_optical_thickness_355nm"][abox])), 2),
    })

    # --- figure ---
    fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True, gridspec_kw={"height_ratios": [3, 3, 1.4]})
    lat2 = np.repeat(tc["latitude"][seg][:, None], hgt.shape[1], 1)
    grp = np.vectorize(lambda v: code2grp.get(v, 0))(cls[seg])
    axes[0].pcolormesh(lat2, hgt[seg], grp, cmap=cmap, norm=norm, shading="nearest")
    axes[0].set(ylim=(0, 18), ylabel="height (km)", title="Radar + lidar target classification (AC-TC). Dashed: 4.7 km melting level; orange above ~12 km is likely misclassified ice, not dust")
    axes[0].axhline(4.7, color="k", lw=0.6, ls="--")
    handles = [plt.Rectangle((0, 0), 1, 1, color=g[2]) for g in GROUPS]
    axes[0].legend(handles, [g[0] for g in GROUPS], fontsize=7, ncol=5, loc="upper center", bbox_to_anchor=(0.5, -0.04), frameon=False)
    sc = (cd["latitude"] >= LAT[0]) & (cd["latitude"] <= LAT[1])
    lat3 = np.repeat(cd["latitude"][sc][:, None], h_cd.shape[1], 1)
    im = axes[1].pcolormesh(lat3, h_cd[sc], w_air[sc], cmap="RdBu_r", vmin=-4, vmax=4, shading="nearest")
    axes[1].set(ylim=(0, 18), ylabel="height (km)",
                title="Vertical air motion estimate from CPR Doppler (Doppler − sedimentation; red = rising, blue = sinking; good-quality pixels)")
    fig.colorbar(im, cax=axes[1].inset_axes([1.005, 0, 0.012, 1]), label="m/s")   # inset: keeps the shared x-axis aligned
    sa = (al["latitude"] >= LAT[0]) & (al["latitude"] <= LAT[1])
    la = al["latitude"][sa]
    for j in range(al["aerosol_layer_top"].shape[1]):
        t_, b_, d_ = al["aerosol_layer_top"][sa, j] / 1000, al["aerosol_layer_base"][sa, j] / 1000, al["aerosol_layer_mean_depolarisation_355nm"][sa, j]
        ok = np.isfinite(t_) & np.isfinite(b_)
        axes[2].vlines(la[ok], b_[ok], t_[ok], colors=np.where(d_[ok] > 0.2, "#d95f02", "#9e9e9e"), lw=1)
    axes[2].set(ylim=(0, 8), ylabel="km", xlabel="latitude (°N)", title="ATLID aerosol layers (orange: depolarisation > 0.2, dust-like). Under thick storm cloud the lidar is blocked, so few layers are retrieved")
    for ax in axes:
        for b in (10, 20):
            ax.axvline(b, color="k", lw=0.6, ls=":")
    lon_mid = float(np.nanmean(tc["longitude"][box]))
    fig.suptitle(f"EarthCARE over the Sahel: {c.date} {c.time_utc} UTC, orbit {c.orbit}{c.frame}, ~{lon_mid:.1f}°E ({c.region}, {c.case_type})", fontsize=11)
    fig.text(0.01, 0.005, "Case study, not a trend. Data: ESA–JAXA EarthCARE L2 (AC__TC__2B, CPR_CD__2A, ATL_ALD_2A) via ESA MAAP. "
             "Code drafted with AI assistance (Claude Code). Dotted lines: study box 10–20°N.", fontsize=6, color="grey")
    fig.tight_layout(rect=(0, 0.015, 1, 0.97))
    fig.savefig(O / f"cross_section_{c.date}_{c.orbit}{c.frame}.png", dpi=120)
    plt.close(fig)

m = pd.DataFrame(rows)
m.to_csv(O / "case_metrics.csv", index=False)
pd.set_option("display.width", 250)
print(m.T.to_string())
