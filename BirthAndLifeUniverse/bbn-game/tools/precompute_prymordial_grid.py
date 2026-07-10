#!/usr/bin/env python3
"""Precompute a Big Bang nucleosynthesis grid with PRyMordial.

This script intentionally has no toy-model or analytic fallback. If PRyMordial
cannot be imported or its smoke test is outside the expected range, the script
stops before writing a production grid.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from tqdm import tqdm


ROOT = Path(__file__).resolve().parents[1]

ETA10_RANGE = (4.5, 7.5)
DELTA_NEFF_RANGE = (-1.0, 3.0)
TAU_N_RANGE = (870.0, 890.0)

ETA10_POINTS = 61
DELTA_NEFF_POINTS = 41
TAU_N_POINTS = 41

STANDARD_POINT = {"eta10": 6.1, "DeltaNeff": 0.0, "tau_n": 880.0}
TARGET_R_HE = (0.30, 0.36)
TARGET_D_H = (2.2e-5, 2.8e-5)

VALUE_KEYS = ("Yp", "D_H", "He3_H", "Li7_H")


def axis(start: float, stop: float, count: int) -> np.ndarray:
    return np.linspace(start, stop, count, dtype=float)


def axis_with_standard(start: float, stop: float, count: int, standard: float) -> np.ndarray:
    if count == 3 and start < standard < stop:
        return np.array([start, standard, stop], dtype=float)
    values = axis(start, stop, count)
    if count >= 3 and start < standard < stop:
        interior = values[1:-1]
        nearest = int(np.argmin(np.abs(interior - standard))) + 1
        values[nearest] = standard
        values.sort()
    return values


def explicit_axis(values: list[float], name: str) -> np.ndarray:
    if len(values) < 2:
        raise SystemExit(f"{name} needs at least two values.")
    axis_values = np.array(sorted(float(value) for value in values), dtype=float)
    if np.any(np.diff(axis_values) <= 0):
        raise SystemExit(f"{name} values must be unique.")
    return axis_values


def s_from_delta_neff(delta_neff: np.ndarray | float) -> np.ndarray | float:
    return np.sqrt(1.0 + 7.0 * np.asarray(delta_neff) / 43.0)


def delta_neff_from_s(s_value: np.ndarray | float) -> np.ndarray | float:
    return (np.asarray(s_value) ** 2 - 1.0) * 43.0 / 7.0


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be >= 1")
    return parsed


def float_pair(values: list[str]) -> tuple[float, float]:
    parsed = (float(values[0]), float(values[1]))
    if parsed[0] >= parsed[1]:
        raise argparse.ArgumentTypeError("range start must be less than range stop")
    return parsed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compute data/bbn_grid.json using PRyMordial."
    )
    parser.add_argument(
        "--prymordial-path",
        default=os.environ.get("PRYMORDIAL_PATH"),
        help="Path to a PRyMordial source checkout. Can also be set with PRYMORDIAL_PATH.",
    )
    parser.add_argument(
        "--workdir",
        type=Path,
        help="Persistent PRyMordial working copy used for generated rate tables.",
    )
    parser.add_argument(
        "--use-source-in-place",
        action="store_true",
        help="Write generated PRyMordial rate tables into --prymordial-path directly.",
    )
    parser.add_argument(
        "--keep-workdir",
        action="store_true",
        help="Keep the temporary PRyMordial working copy after the run.",
    )
    parser.add_argument(
        "--smoke-only",
        action="store_true",
        help="Run only the standard-point PRyMordial smoke test.",
    )
    parser.add_argument(
        "--numba",
        action="store_true",
        help="Enable PRyMordial's numba_flag. This requires numba/llvmlite in the active environment.",
    )
    parser.add_argument(
        "--include-standard-point",
        action="store_true",
        help="For sparse test grids, force each axis to include the standard point.",
    )
    parser.add_argument("--eta-points", type=positive_int, default=ETA10_POINTS)
    parser.add_argument(
        "--delta-neff-points", type=positive_int, default=DELTA_NEFF_POINTS
    )
    parser.add_argument("--tau-points", type=positive_int, default=TAU_N_POINTS)
    parser.add_argument(
        "--eta10-range",
        nargs=2,
        default=ETA10_RANGE,
        metavar=("START", "STOP"),
        help="eta10 axis range.",
    )
    parser.add_argument(
        "--eta10-values",
        nargs="+",
        type=float,
        help="Explicit eta10 axis values. Overrides --eta10-range and --eta-points.",
    )
    parser.add_argument(
        "--delta-neff-range",
        nargs=2,
        default=DELTA_NEFF_RANGE,
        metavar=("START", "STOP"),
        help="DeltaNeff axis range. Ignored when --s-range is set.",
    )
    parser.add_argument(
        "--delta-neff-values",
        nargs="+",
        type=float,
        help="Explicit DeltaNeff axis values. Ignored when --s-range or --s-values is set.",
    )
    parser.add_argument(
        "--s-range",
        nargs=2,
        metavar=("START", "STOP"),
        help="S = H/H_std axis range; converted to DeltaNeff before PRyMordial runs.",
    )
    parser.add_argument(
        "--s-values",
        nargs="+",
        type=float,
        help="Explicit S = H/H_std axis values; converted to DeltaNeff before PRyMordial runs.",
    )
    parser.add_argument(
        "--tau-n-range",
        nargs=2,
        default=TAU_N_RANGE,
        metavar=("START", "STOP"),
        help="tau_n axis range in seconds.",
    )
    parser.add_argument(
        "--tau-n-values",
        nargs="+",
        type=float,
        help="Explicit tau_n axis values in seconds. Overrides --tau-n-range and --tau-points.",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        help="Output JSON path. Defaults to data/bbn_grid.json for the full grid.",
    )
    parser.add_argument(
        "--output-npz",
        type=Path,
        help="Output NPZ path. Defaults to data/bbn_grid.npz for the full grid.",
    )
    parser.add_argument(
        "--plots-dir",
        type=Path,
        default=ROOT / "data" / "sanity_plots",
        help="Directory for sanity plots.",
    )
    args = parser.parse_args()
    args.eta10_range = float_pair(list(args.eta10_range))
    args.delta_neff_range = float_pair(list(args.delta_neff_range))
    args.tau_n_range = float_pair(list(args.tau_n_range))
    if args.s_range:
        args.s_range = float_pair(list(args.s_range))
        if args.s_range[0] <= 0:
            raise SystemExit("S range must be positive.")
    if args.s_values and any(value <= 0 for value in args.s_values):
        raise SystemExit("S values must be positive.")
    if args.s_values and args.delta_neff_values:
        raise SystemExit("Use either --s-values or --delta-neff-values, not both.")
    if args.s_range and args.delta_neff_values:
        raise SystemExit("Use either --s-range or --delta-neff-values, not both.")
    return args


def is_full_grid(args: argparse.Namespace) -> bool:
    return (
        args.eta_points == ETA10_POINTS
        and args.delta_neff_points == DELTA_NEFF_POINTS
        and args.tau_points == TAU_N_POINTS
        and args.eta10_range == ETA10_RANGE
        and args.delta_neff_range == DELTA_NEFF_RANGE
        and args.tau_n_range == TAU_N_RANGE
        and not args.s_range
        and not args.eta10_values
        and not args.delta_neff_values
        and not args.s_values
        and not args.tau_n_values
    )


def output_paths(args: argparse.Namespace) -> tuple[Path, Path]:
    full_grid = is_full_grid(args)
    default_stem = "bbn_grid" if full_grid else "bbn_grid_test"
    json_path = args.output_json or (ROOT / "data" / f"{default_stem}.json")
    npz_path = args.output_npz or (ROOT / "data" / f"{default_stem}.npz")
    return json_path.resolve(), npz_path.resolve()


def require_prymordial_source(path_text: str | None) -> Path:
    if not path_text:
        raise SystemExit(
            "PRyMordial source path is required.\n"
            "Clone it and pass the path explicitly, for example:\n"
            "  git clone https://github.com/vallima/PRyMordial.git external/PRyMordial\n"
            "  PRYMORDIAL_PATH=external/PRyMordial python tools/precompute_prymordial_grid.py\n"
            "The GitHub repository is source-importable but is not currently pip-installable "
            "because it has no pyproject.toml or setup.py."
        )
    path = Path(path_text).expanduser().resolve()
    if not (path / "PRyM" / "PRyM_init.py").is_file():
        raise SystemExit(f"Not a PRyMordial checkout: {path}")
    if not (path / "PRyMrates").is_dir():
        raise SystemExit(f"PRyMordial rate-data directory is missing: {path / 'PRyMrates'}")
    return path


def copy_prymordial_tree(source: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    ignore = shutil.ignore_patterns(
        ".git",
        "__pycache__",
        "*.pyc",
        ".ipynb_checkpoints",
    )
    for name in ("PRyM", "PRyMrates"):
        src = source / name
        dst = destination / name
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=ignore)


def prepare_workdir(
    source: Path, args: argparse.Namespace
) -> tuple[Path, bool]:
    if args.use_source_in_place:
        return source, False

    if args.workdir:
        workdir = args.workdir.expanduser().resolve()
        copy_prymordial_tree(source, workdir)
        return workdir, False

    workdir = Path(tempfile.mkdtemp(prefix="bbn_prymordial_")).resolve()
    copy_prymordial_tree(source, workdir)
    return workdir, not args.keep_workdir


def configure_prymordial(prymini: Any, *, use_numba: bool) -> None:
    prymini.numba_flag = use_numba
    prymini.numdiff_flag = False
    prymini.verbose_flag = False
    prymini.aTid_flag = True
    prymini.compute_nTOp_thermal_flag = False
    prymini.save_nTOp_thermal_flag = False
    prymini.smallnet_flag = False
    prymini.julia_flag = False


def import_prymordial(workdir: Path, *, use_numba: bool) -> tuple[Any, Any]:
    os.chdir(workdir)
    sys.path.insert(0, str(workdir))
    import PRyM.PRyM_init as PRyMini  # type: ignore

    PRyMini.working_dir = str(workdir)
    configure_prymordial(PRyMini, use_numba=use_numba)

    import PRyM.PRyM_main as PRyMmain  # type: ignore

    return PRyMini, PRyMmain


def run_point(
    prymini: Any,
    prymmain: Any,
    *,
    eta10: float,
    delta_neff: float,
    tau_n: float,
    recompute_background: bool,
    recompute_weak_rates: bool,
    save_rate_cache: bool,
) -> dict[str, float]:
    prymini.eta0b = eta10 * 1e-10
    prymini.DeltaNeff = delta_neff
    prymini.tau_n = tau_n
    prymini.compute_bckg_flag = recompute_background
    prymini.compute_nTOp_flag = recompute_weak_rates
    prymini.save_bckg_flag = save_rate_cache
    prymini.save_nTOp_flag = save_rate_cache

    result = prymmain.PRyMclass().PRyMresults()
    values = {
        "Yp": float(result[4]),
        "D_H": float(result[5]) * 1e-5,
        "He3_H": float(result[6]) * 1e-5,
        "Li7_H": float(result[7]) * 1e-10,
    }
    if not all(math.isfinite(v) for v in values.values()):
        raise RuntimeError(f"PRyMordial returned non-finite values: {values}")
    return values


def smoke_test(prymini: Any, prymmain: Any) -> dict[str, float]:
    started = time.perf_counter()
    values = run_point(
        prymini,
        prymmain,
        eta10=STANDARD_POINT["eta10"],
        delta_neff=STANDARD_POINT["DeltaNeff"],
        tau_n=STANDARD_POINT["tau_n"],
        recompute_background=True,
        recompute_weak_rates=True,
        save_rate_cache=True,
    )
    elapsed = time.perf_counter() - started
    print(
        "Smoke test: "
        f"Yp={values['Yp']:.8f}, D/H={values['D_H']:.8e} "
        f"({elapsed:.1f} s)"
    )
    if not (0.23 <= values["Yp"] <= 0.27):
        raise SystemExit(
            "PRyMordial smoke test failed: Yp is far from the expected ~0.247."
        )
    if not (1.5e-5 <= values["D_H"] <= 3.5e-5):
        raise SystemExit(
            "PRyMordial smoke test failed: D/H is far from the expected ~2.5e-5."
        )
    return values


def flatten_index(i_eta: int, i_delta: int, i_tau: int, n_delta: int, n_tau: int) -> int:
    return (i_eta * n_delta + i_delta) * n_tau + i_tau


def compute_grid(
    prymini: Any,
    prymmain: Any,
    eta10_axis: np.ndarray,
    delta_neff_axis: np.ndarray,
    tau_axis: np.ndarray,
) -> dict[str, np.ndarray]:
    shape = (len(eta10_axis), len(delta_neff_axis), len(tau_axis))
    total = int(np.prod(shape))
    arrays = {key: np.empty(total, dtype=float) for key in VALUE_KEYS}

    with tqdm(total=total, unit="pt") as progress:
        for i_delta, delta_neff in enumerate(delta_neff_axis):
            progress.set_description(f"DeltaNeff={delta_neff:.2f}")
            first_for_delta = True
            for i_eta, eta10 in enumerate(eta10_axis):
                for i_tau, tau_n in enumerate(tau_axis):
                    values = run_point(
                        prymini,
                        prymmain,
                        eta10=float(eta10),
                        delta_neff=float(delta_neff),
                        tau_n=float(tau_n),
                        recompute_background=first_for_delta,
                        recompute_weak_rates=first_for_delta,
                        save_rate_cache=first_for_delta,
                    )
                    first_for_delta = False
                    idx = flatten_index(
                        i_eta,
                        i_delta,
                        i_tau,
                        len(delta_neff_axis),
                        len(tau_axis),
                    )
                    for key, value in values.items():
                        arrays[key][idx] = value
                    progress.update(1)

    return arrays


def make_payload(
    *,
    eta10_axis: np.ndarray,
    delta_neff_axis: np.ndarray,
    tau_axis: np.ndarray,
    values: dict[str, np.ndarray],
    prymordial_source: Path,
    smoke_values: dict[str, float],
    elapsed_s: float,
    full_grid: bool,
    use_numba: bool,
) -> dict[str, Any]:
    s_axis = np.round(np.asarray(s_from_delta_neff(delta_neff_axis), dtype=float), 12)
    return {
        "meta": {
            "backend": "PRyMordial",
            "status": "ready",
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "prymordial_source": str(prymordial_source),
            "full_spec_grid": full_grid,
            "numba_flag": use_numba,
            "eta10_range": [float(eta10_axis[0]), float(eta10_axis[-1])],
            "DeltaNeff_range": [float(delta_neff_axis[0]), float(delta_neff_axis[-1])],
            "S_range": [float(s_axis[0]), float(s_axis[-1])],
            "tau_n_range": [float(tau_axis[0]), float(tau_axis[-1])],
            "standard_point": STANDARD_POINT,
            "smoke_test": smoke_values,
            "elapsed_s": elapsed_s,
            "units": {
                "eta10": "dimensionless",
                "DeltaNeff": "dimensionless",
                "tau_n": "s",
                "Yp": "mass fraction",
                "D_H": "number ratio",
                "He3_H": "number ratio",
                "Li7_H": "number ratio",
            },
        },
        "axes": {
            "eta10": eta10_axis.tolist(),
            "DeltaNeff": delta_neff_axis.tolist(),
            "S": s_axis.tolist(),
            "tau_n": tau_axis.tolist(),
        },
        "shape": [len(eta10_axis), len(delta_neff_axis), len(tau_axis)],
        "values": {key: values[key].tolist() for key in VALUE_KEYS},
    }


def write_outputs(
    json_path: Path,
    npz_path: Path,
    payload: dict[str, Any],
    values: dict[str, np.ndarray],
) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    npz_path.parent.mkdir(parents=True, exist_ok=True)
    with json_path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    axes = payload["axes"]
    np.savez_compressed(
        npz_path,
        eta10=np.array(axes["eta10"], dtype=float),
        DeltaNeff=np.array(axes["DeltaNeff"], dtype=float),
        tau_n=np.array(axes["tau_n"], dtype=float),
        shape=np.array(payload["shape"], dtype=int),
        **values,
    )
    print(f"Wrote {json_path}")
    print(f"Wrote {npz_path}")


def nearest_index(values: np.ndarray, target: float) -> int:
    return int(np.argmin(np.abs(values - target)))


def plot_sanity(
    plots_dir: Path,
    eta10_axis: np.ndarray,
    delta_neff_axis: np.ndarray,
    tau_axis: np.ndarray,
    values: dict[str, np.ndarray],
) -> None:
    plots_dir.mkdir(parents=True, exist_ok=True)
    cache_root = Path(tempfile.gettempdir()) / "bbn_game_matplotlib_cache"
    mpl_config_dir = cache_root / "matplotlib"
    xdg_cache_dir = cache_root / "xdg"
    mpl_config_dir.mkdir(parents=True, exist_ok=True)
    xdg_cache_dir.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("MPLCONFIGDIR", str(mpl_config_dir))
    os.environ.setdefault("XDG_CACHE_HOME", str(xdg_cache_dir))

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    n_delta = len(delta_neff_axis)
    n_tau = len(tau_axis)

    def value_at(key: str, i_eta: int, i_delta: int, i_tau: int) -> float:
        idx = flatten_index(i_eta, i_delta, i_tau, n_delta, n_tau)
        return float(values[key][idx])

    i_eta_std = nearest_index(eta10_axis, STANDARD_POINT["eta10"])
    i_delta_std = nearest_index(delta_neff_axis, STANDARD_POINT["DeltaNeff"])
    i_tau_std = nearest_index(tau_axis, STANDARD_POINT["tau_n"])

    s_axis = s_from_delta_neff(delta_neff_axis)
    yp_vs_s = [
        value_at("Yp", i_eta_std, i_delta, i_tau_std)
        for i_delta in range(len(delta_neff_axis))
    ]
    yp_band = [TARGET_R_HE[0] / (1 + TARGET_R_HE[0]), TARGET_R_HE[1] / (1 + TARGET_R_HE[1])]

    fig, ax = plt.subplots(figsize=(7.0, 4.2))
    ax.plot(s_axis, yp_vs_s, color="#1f77b4", lw=2)
    ax.axhspan(yp_band[0], yp_band[1], color="#ffcc66", alpha=0.28, label="R_He target band")
    ax.set_xlabel("S = H/H_std")
    ax.set_ylabel("Yp")
    ax.set_title("Yp vs S at eta10=6.1, tau_n=880 s")
    ax.grid(alpha=0.25)
    ax.legend()
    fig.tight_layout()
    fig.savefig(plots_dir / "sanity_yp_vs_s.png", dpi=160)
    plt.close(fig)

    dh_vs_eta = [
        value_at("D_H", i_eta, i_delta_std, i_tau_std)
        for i_eta in range(len(eta10_axis))
    ]
    fig, ax = plt.subplots(figsize=(7.0, 4.2))
    ax.plot(eta10_axis, dh_vs_eta, color="#2ca02c", lw=2)
    ax.axhspan(TARGET_D_H[0], TARGET_D_H[1], color="#ffcc66", alpha=0.28, label="D/H target band")
    ax.set_xlabel("eta10")
    ax.set_ylabel("D/H")
    ax.set_yscale("log")
    ax.set_title("D/H vs eta10 at DeltaNeff=0, tau_n=880 s")
    ax.grid(alpha=0.25, which="both")
    ax.legend()
    fig.tight_layout()
    fig.savefig(plots_dir / "sanity_dh_vs_eta10.png", dpi=160)
    plt.close(fig)

    yp = values["Yp"]
    r_he = yp / (1.0 - yp)
    dh = values["D_H"]
    fig, ax = plt.subplots(figsize=(6.2, 5.2))
    ax.scatter(r_he, dh, s=3, alpha=0.16, color="#1f77b4", edgecolors="none")
    ax.axvspan(TARGET_R_HE[0], TARGET_R_HE[1], color="#ffcc66", alpha=0.24)
    ax.axhspan(TARGET_D_H[0], TARGET_D_H[1], color="#ffcc66", alpha=0.24)
    ax.set_xlabel("R_He = M(He4)/M(H)")
    ax.set_ylabel("D/H")
    ax.set_yscale("log")
    ax.set_title("R_He and D/H target bands")
    ax.grid(alpha=0.25, which="both")
    fig.tight_layout()
    fig.savefig(plots_dir / "sanity_targets.png", dpi=160)
    plt.close(fig)

    print(f"Wrote sanity plots to {plots_dir}")


def main() -> int:
    args = parse_args()
    source = require_prymordial_source(args.prymordial_path)
    json_path, npz_path = output_paths(args)
    plots_dir = args.plots_dir.expanduser().resolve()
    start_cwd = Path.cwd()
    workdir, cleanup_workdir = prepare_workdir(source, args)

    if args.keep_workdir or args.workdir or args.use_source_in_place:
        print(f"PRyMordial workdir: {workdir}")

    try:
        prymini, prymmain = import_prymordial(workdir, use_numba=args.numba)
        smoke_values = smoke_test(prymini, prymmain)
        if args.smoke_only:
            return 0

        if args.eta10_values:
            eta10_axis = explicit_axis(args.eta10_values, "--eta10-values")
        elif args.include_standard_point:
            eta10_axis = axis_with_standard(
                *args.eta10_range, args.eta_points, STANDARD_POINT["eta10"]
            )
        else:
            eta10_axis = axis(*args.eta10_range, args.eta_points)

        if args.s_values:
            s_axis = explicit_axis(args.s_values, "--s-values")
            delta_neff_axis = np.asarray(delta_neff_from_s(s_axis), dtype=float)
        elif args.s_range:
            if args.include_standard_point:
                s_axis = axis_with_standard(*args.s_range, args.delta_neff_points, 1.0)
            else:
                s_axis = axis(*args.s_range, args.delta_neff_points)
            delta_neff_axis = np.asarray(delta_neff_from_s(s_axis), dtype=float)
        elif args.delta_neff_values:
            delta_neff_axis = explicit_axis(args.delta_neff_values, "--delta-neff-values")
        elif args.include_standard_point:
            delta_neff_axis = axis_with_standard(
                *args.delta_neff_range,
                args.delta_neff_points,
                STANDARD_POINT["DeltaNeff"],
            )
        else:
            delta_neff_axis = axis(*args.delta_neff_range, args.delta_neff_points)

        if args.tau_n_values:
            tau_axis = explicit_axis(args.tau_n_values, "--tau-n-values")
        elif args.include_standard_point:
            tau_axis = axis_with_standard(
                *args.tau_n_range, args.tau_points, STANDARD_POINT["tau_n"]
            )
        else:
            tau_axis = axis(*args.tau_n_range, args.tau_points)

        if args.include_standard_point:
            if not np.any(np.isclose(eta10_axis, STANDARD_POINT["eta10"])):
                raise SystemExit("eta10 axis does not include the standard value 6.1.")
            if not np.any(np.isclose(delta_neff_axis, STANDARD_POINT["DeltaNeff"])):
                raise SystemExit("DeltaNeff/S axis does not include the standard value S=1.")
            if not np.any(np.isclose(tau_axis, STANDARD_POINT["tau_n"])):
                raise SystemExit("tau_n axis does not include the standard value 880 s.")

        print(
            "Computing grid "
            f"{len(eta10_axis)} x {len(delta_neff_axis)} x {len(tau_axis)} "
            f"= {len(eta10_axis) * len(delta_neff_axis) * len(tau_axis)} points"
        )
        started = time.perf_counter()
        values = compute_grid(prymini, prymmain, eta10_axis, delta_neff_axis, tau_axis)
        elapsed_s = time.perf_counter() - started

        payload = make_payload(
            eta10_axis=eta10_axis,
            delta_neff_axis=delta_neff_axis,
            tau_axis=tau_axis,
            values=values,
            prymordial_source=source,
            smoke_values=smoke_values,
            elapsed_s=elapsed_s,
            full_grid=is_full_grid(args),
            use_numba=args.numba,
        )
        write_outputs(json_path, npz_path, payload, values)
        plot_sanity(plots_dir, eta10_axis, delta_neff_axis, tau_axis, values)
        return 0
    finally:
        os.chdir(start_cwd)
        if cleanup_workdir:
            shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
