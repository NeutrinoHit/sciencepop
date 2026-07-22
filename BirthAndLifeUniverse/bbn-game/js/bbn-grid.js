(function () {
  "use strict";

  const VALUE_KEYS = ["Yp", "D_H", "He3_H", "Li7_H"];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function deltaNeffFromS(s) {
    return ((s * s - 1) * 43) / 7;
  }

  function sFromDeltaNeff(deltaNeff) {
    return Math.sqrt(1 + (7 * deltaNeff) / 43);
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function validateGrid(grid) {
    if (!grid || typeof grid !== "object") {
      return { ok: false, message: "data/bbn_grid.json не загружен." };
    }
    if (!grid.meta || grid.meta.backend !== "PRyMordial") {
      return { ok: false, message: "Сетка должна быть посчитана backend = PRyMordial." };
    }
    if (grid.meta.status && grid.meta.status !== "ready") {
      return {
        ok: false,
        message: grid.meta.error || "Сетка PRyMordial ещё не посчитана.",
      };
    }
    const axes = grid.axes || {};
    const shape = grid.shape || [];
    if (!Array.isArray(shape) || shape.length !== 3) {
      return { ok: false, message: "Некорректное поле shape в bbn_grid.json." };
    }
    const [nEta, nDelta, nTau] = shape;
    if (nEta < 2 || nDelta < 2 || nTau < 2) {
      return { ok: false, message: "Для трёхмерной интерполяции нужны минимум две точки на каждой оси." };
    }
    if (
      !Array.isArray(axes.eta10) ||
      !Array.isArray(axes.DeltaNeff) ||
      !Array.isArray(axes.tau_n) ||
      axes.eta10.length !== nEta ||
      axes.DeltaNeff.length !== nDelta ||
      axes.tau_n.length !== nTau
    ) {
      return { ok: false, message: "Оси сетки не согласованы с shape." };
    }
    const total = nEta * nDelta * nTau;
    for (const key of VALUE_KEYS) {
      if (!grid.values || !Array.isArray(grid.values[key]) || grid.values[key].length !== total) {
        return { ok: false, message: `Поле values.${key} отсутствует или имеет неверную длину.` };
      }
    }
    return { ok: true };
  }

  function bracket(axis, rawValue) {
    const n = axis.length;
    const value = clamp(rawValue, axis[0], axis[n - 1]);
    if (value <= axis[0]) return { i0: 0, i1: 1, t: 0 };
    if (value >= axis[n - 1]) return { i0: n - 2, i1: n - 1, t: 1 };

    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (axis[mid] <= value) lo = mid;
      else hi = mid;
    }
    const span = axis[hi] - axis[lo];
    return { i0: lo, i1: hi, t: span === 0 ? 0 : (value - axis[lo]) / span };
  }

  function flattenIndex(iEta, iDelta, iTau, nDelta, nTau) {
    return (iEta * nDelta + iDelta) * nTau + iTau;
  }

  function interpolateOne(values, bEta, bDelta, bTau, nDelta, nTau) {
    let result = 0;
    for (const etaCorner of [0, 1]) {
      const iEta = etaCorner ? bEta.i1 : bEta.i0;
      const wEta = etaCorner ? bEta.t : 1 - bEta.t;
      for (const deltaCorner of [0, 1]) {
        const iDelta = deltaCorner ? bDelta.i1 : bDelta.i0;
        const wDelta = deltaCorner ? bDelta.t : 1 - bDelta.t;
        for (const tauCorner of [0, 1]) {
          const iTau = tauCorner ? bTau.i1 : bTau.i0;
          const wTau = tauCorner ? bTau.t : 1 - bTau.t;
          const idx = flattenIndex(iEta, iDelta, iTau, nDelta, nTau);
          result += values[idx] * wEta * wDelta * wTau;
        }
      }
    }
    return result;
  }

  function interpolate(grid, params) {
    const validation = validateGrid(grid);
    if (!validation.ok) throw new Error(validation.message);

    const axes = grid.axes;
    const [nEta, nDelta, nTau] = grid.shape;
    const bEta = bracket(axes.eta10, params.eta10);
    const bDelta = bracket(axes.DeltaNeff, params.DeltaNeff);
    const bTau = bracket(axes.tau_n, params.tau_n);
    const output = {};

    for (const key of VALUE_KEYS) {
      const value = interpolateOne(grid.values[key], bEta, bDelta, bTau, nDelta, nTau);
      if (!isFiniteNumber(value)) {
        throw new Error(`Интерполяция дала нечисловое значение для ${key}.`);
      }
      output[key] = value;
    }
    return output;
  }

  window.BBNGrid = {
    VALUE_KEYS,
    clamp,
    deltaNeffFromS,
    sFromDeltaNeff,
    validateGrid,
    interpolate,
  };
})();
