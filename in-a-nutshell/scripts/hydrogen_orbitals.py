"""Hydrogen-atom probability densities for the lecture «Что такое атом?».

Exact bound-state solutions of the Schrödinger equation,
psi_nlm = R_nl(r) Y_lm(theta, phi). |Y_lm|^2 does not depend on phi, so a
slice through the nucleus in the x-z plane shows the full pattern.
Each panel is normalized to its own maximum and spans its own size.

Run from the repository root:
    python in-a-nutshell/scripts/hydrogen_orbitals.py
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.special import eval_genlaguerre, lpmv

OUT = Path(__file__).resolve().parents[1] / "assets/what-is-atom/hydrogen-densities.png"
STATES = [(1, 0, 0), (2, 0, 0), (2, 1, 0), (2, 1, 1), (3, 0, 0),
          (3, 1, 0), (3, 1, 1), (3, 2, 0), (3, 2, 1), (3, 2, 2)]


def density(n, l, m, x, z):
    """|psi_nlm|^2 in units of the Bohr radius, up to normalization."""
    r = np.hypot(x, z)
    rho = 2.0 * r / n
    radial = rho**l * np.exp(-rho / 2.0) * eval_genlaguerre(n - l - 1, 2 * l + 1, rho)
    cos_theta = np.divide(z, r, out=np.ones_like(r), where=r > 0)
    angular = lpmv(m, l, cos_theta)
    return (radial * angular) ** 2


def main():
    fig, axes = plt.subplots(2, 5, figsize=(16, 7.2), facecolor="black")
    for ax, (n, l, m) in zip(axes.flat, STATES):
        half = 3.0 * n * n + 4.0
        grid = np.linspace(-half, half, 601)
        x, z = np.meshgrid(grid, grid)
        d = density(n, l, m, x, z)
        ax.imshow(np.sqrt(d / d.max()), extent=(-half, half, -half, half),
                  origin="lower", cmap="inferno", vmin=0, vmax=1)
        ax.set_title(f"n = {n}, l = {l}, m = {m}", color="#e8e8e8", fontsize=15, pad=8)
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_color("#444444")
    fig.tight_layout(pad=0.8)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=110, facecolor="black")
    print(OUT)


if __name__ == "__main__":
    main()
