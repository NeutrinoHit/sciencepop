(function () {
  "use strict";

  const PARAM_RANGES = {
    eta10: [3.0, 10.0],
    S: [0.82, 1.35],
    tau_n: [800, 960],
  };

  const STANDARD_PARAMS = {
    eta10: 6.1,
    S: 1.0,
    tau_n: 880,
  };

  const DEFAULT_INITIAL = {
    eta10: 3.0,
    S: 0.82,
    tau_n: 800,
  };

  const GOALS = [
    {
      key: "R_He",
      titleHtml: "R<sub>He</sub> = M(<sup>4</sup>He)/M(H)",
      rangeHtml: "0–1",
      range: [0, 1],
      gate: [0.3, 0.36],
      scale: "linear",
      markerText: "R_He marker",
      format: (value) => formatFixed(value, 3),
    },
    {
      key: "D_H",
      titleHtml: "D/H по числу",
      rangeHtml: "10<sup>−6</sup>–10<sup>−4</sup>",
      range: [1e-6, 1e-4],
      gate: [2.2e-5, 2.8e-5],
      scale: "log",
      markerText: "D/H marker",
      format: (value) => formatScientific(value),
    },
    {
      key: "He3_H",
      titleHtml: "<sup>3</sup>He/H по числу",
      rangeHtml: "10<sup>−6</sup>–10<sup>−4</sup>",
      range: [1e-6, 1e-4],
      gate: [0.8e-5, 1.3e-5],
      scale: "log",
      markerText: "He3/H marker",
      format: (value) => formatScientific(value),
    },
    {
      key: "Li7_H",
      titleHtml: "<sup>7</sup>Li/H по числу",
      rangeHtml: "10<sup>−11</sup>–10<sup>−8</sup>",
      range: [1e-11, 1e-8],
      gate: [3e-10, 7e-10],
      scale: "log",
      markerText: "Li7/H marker",
      format: (value) => formatScientific(value),
    },
  ];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function htmlEl(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.innerHTML = html;
    return node;
  }

  function formatFixed(value, digits) {
    return Number(value).toFixed(digits);
  }

  function superscriptInteger(value) {
    const map = {
      "-": "⁻",
      "+": "⁺",
      "0": "⁰",
      "1": "¹",
      "2": "²",
      "3": "³",
      "4": "⁴",
      "5": "⁵",
      "6": "⁶",
      "7": "⁷",
      "8": "⁸",
      "9": "⁹",
    };
    return String(value)
      .split("")
      .map((char) => map[char] || char)
      .join("");
  }

  function formatScientific(value, digits = 2) {
    if (!Number.isFinite(value) || value <= 0) return "—";
    const exponent = Math.floor(Math.log10(value));
    const mantissa = value / Math.pow(10, exponent);
    return `${mantissa.toFixed(digits)}×10${superscriptInteger(exponent)}`;
  }

  function linearPercent(value, range) {
    return 100 * window.BBNGrid.clamp((value - range[0]) / (range[1] - range[0]), 0, 1);
  }

  function logPercent(value, range) {
    const logMin = Math.log10(range[0]);
    const logMax = Math.log10(range[1]);
    const logValue = Math.log10(window.BBNGrid.clamp(value, range[0], range[1]));
    return 100 * window.BBNGrid.clamp((logValue - logMin) / (logMax - logMin), 0, 1);
  }

  function goalPercent(value, goal) {
    if (goal.scale === "log") return logPercent(value, goal.range);
    return linearPercent(value, goal.range);
  }

  function isInside(value, gate) {
    return value >= gate[0] && value <= gate[1];
  }

  function setRangeValue(input, value) {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function axisCovers(axis, range) {
    return Array.isArray(axis) && axis.length >= 2 && axis[0] <= range[0] && axis[axis.length - 1] >= range[1];
  }

  function createControl(labelHtml, min, max, step, value, formatter) {
    const wrap = el("label", "bbn-control");
    const top = el("div", "bbn-control-top");
    const labelNode = htmlEl("span", "bbn-control-label", labelHtml);
    const valueNode = el("span", "bbn-control-value");
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    valueNode.textContent = formatter(value);
    input.addEventListener("input", () => {
      valueNode.textContent = formatter(Number(input.value));
    });
    top.append(labelNode, valueNode);
    wrap.append(top, input);
    return { wrap, input, valueNode };
  }

  function createGoalScale(goal) {
    const scale = el("div", "bbn-scale");
    const head = el("div", "bbn-scale-head");
    head.append(htmlEl("span", "bbn-scale-title", goal.titleHtml), htmlEl("span", "bbn-scale-range", goal.rangeHtml));
    const track = el("div", "bbn-scale-track");
    const band = el("div", "bbn-target-band");
    const marker = el("div", "bbn-marker");
    marker.setAttribute("aria-label", goal.markerText);
    const label = el("div", "bbn-marker-label", "—");
    track.append(band, marker, label);
    scale.append(head, track);
    return { goal, scale, band, marker, label };
  }

  function setBand(element, leftPct, rightPct) {
    element.style.left = `${leftPct}%`;
    element.style.width = `${Math.max(0, rightPct - leftPct)}%`;
  }

  function setGoalMarker(view, percent, text, hit) {
    view.marker.style.left = `${percent}%`;
    view.label.style.left = `${percent}%`;
    view.label.textContent = text;
    view.marker.classList.toggle("is-hit", hit);
    view.marker.classList.toggle("is-off", !hit);
    view.label.classList.toggle("is-hit", hit);
    view.label.classList.toggle("is-off", !hit);
    view.scale.classList.toggle("is-hit", hit);
    view.scale.classList.toggle("is-off", !hit);
  }

  function evaluate(point) {
    const values = {
      R_He: point.Yp / (1 - point.Yp),
      D_H: point.D_H,
      He3_H: point.He3_H,
      Li7_H: point.Li7_H,
    };
    const hits = GOALS.reduce((count, goal) => count + (isInside(values[goal.key], goal.gate) ? 1 : 0), 0);
    return {
      values,
      hits,
      total: GOALS.length,
      ok: hits === GOALS.length,
    };
  }

  function renderError(grid, validation) {
    const root = el("div", "bbn-game bbn-game-error");
    const title = el("div", "bbn-error-title", "Сетка PRyMordial не готова");
    const text = el("p", "bbn-error-text", validation.message);
    const command = el(
      "pre",
      "bbn-error-command",
      "PRYMORDIAL_PATH=external/PRyMordial python tools/precompute_prymordial_grid.py"
    );
    const note = el(
      "p",
      "bbn-error-text",
      "UI не использует приближённые формулы и не рисует toy-модель вместо данных."
    );
    root.append(title, text, command, note);
    root.cleanup = function () {};
    return root;
  }

  function createApp(grid, options = {}) {
    const validation = window.BBNGrid.validateGrid(grid);
    if (!validation.ok) return renderError(grid, validation);

    const axes = grid.axes;
    const sAxis = Array.isArray(axes.S) && axes.S.length === axes.DeltaNeff.length
      ? axes.S
      : axes.DeltaNeff.map(window.BBNGrid.sFromDeltaNeff);

    if (
      !axisCovers(axes.eta10, PARAM_RANGES.eta10) ||
      !axisCovers(sAxis, PARAM_RANGES.S) ||
      !axisCovers(axes.tau_n, PARAM_RANGES.tau_n)
    ) {
      return renderError(grid, {
        ok: false,
        message:
          "Сетка PRyMordial не покрывает игровые диапазоны: η10 = 3.0–10.0, S = 0.82–1.35, τn = 800–960 s.",
      });
    }

    const config = {
      className: "",
      kicker: "Большой взрыв: нуклеосинтез",
      title: "Синтезируй лёгкие элементы",
      subtitle:
        "Настрой плотность барионов, скорость расширения и время жизни нейтрона так, чтобы все четыре маркера прошли через ворота.",
      initial: DEFAULT_INITIAL,
      showUniverseButton: true,
      showAutoButtons: true,
      showDeltaNeff: false,
      footerHtml: "",
      ...options,
    };
    config.initial = {
      ...DEFAULT_INITIAL,
      ...(options.initial || {}),
    };

    const root = el("div", `bbn-game ${config.className}`.trim());
    const header = el("div", "bbn-header");
    header.append(
      el("div", "bbn-kicker", config.kicker),
      el("h1", "bbn-title", config.title)
    );
    const subtitle = el("p", "bbn-subtitle", config.subtitle);

    const layout = el("div", "bbn-layout");
    const controls = el("div", "bbn-controls");
    const results = el("div", "bbn-results");

    const eta = createControl(
      "η<sub>10</sub> = 10<sup>10</sup>η",
      PARAM_RANGES.eta10[0],
      PARAM_RANGES.eta10[1],
      0.01,
      window.BBNGrid.clamp(config.initial.eta10, PARAM_RANGES.eta10[0], PARAM_RANGES.eta10[1]),
      (value) => formatFixed(value, 2)
    );
    const s = createControl(
      "S = H/H<sub>std</sub>",
      PARAM_RANGES.S[0],
      PARAM_RANGES.S[1],
      0.001,
      window.BBNGrid.clamp(config.initial.S, PARAM_RANGES.S[0], PARAM_RANGES.S[1]),
      (value) => formatFixed(value, 3)
    );
    const tau = createControl(
      "τ<sub>n</sub>",
      PARAM_RANGES.tau_n[0],
      PARAM_RANGES.tau_n[1],
      0.1,
      window.BBNGrid.clamp(config.initial.tau_n, PARAM_RANGES.tau_n[0], PARAM_RANGES.tau_n[1]),
      (value) => `${formatFixed(value, 1)} с`
    );
    controls.append(eta.wrap, s.wrap, tau.wrap);

    const buttons = el("div", "bbn-buttons");
    let universeButton = null;
    let autoButton = null;
    let stopButton = null;
    if (config.showUniverseButton) {
      universeButton = el("button", "bbn-button bbn-button-primary", "Наша Вселенная");
      buttons.append(universeButton);
    }
    if (config.showAutoButtons) {
      autoButton = el("button", "bbn-button", "Автопоказ");
      stopButton = el("button", "bbn-button", "Стоп");
      buttons.append(autoButton, stopButton);
    }
    if (buttons.children.length > 0) controls.append(buttons);

    const params = el("div", "bbn-param-readout");
    if (config.showDeltaNeff) controls.append(params);

    const goalViews = GOALS.map(createGoalScale);
    for (const view of goalViews) {
      setBand(
        view.band,
        goalPercent(view.goal.gate[0], view.goal),
        goalPercent(view.goal.gate[1], view.goal)
      );
      results.append(view.scale);
    }

    const verdict = el("div", "bbn-verdict");
    results.append(verdict);
    layout.append(controls, results);
    root.append(header, subtitle, layout);
    if (config.footerHtml) {
      root.append(htmlEl("div", "bbn-app-footer", config.footerHtml));
    }

    let frame = null;
    let autoStartedAt = 0;

    function stopAuto() {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
      if (stopButton) stopButton.disabled = true;
      if (autoButton) autoButton.disabled = false;
    }

    function update() {
      try {
        const eta10 = Number(eta.input.value);
        const sValue = Number(s.input.value);
        const tauN = Number(tau.input.value);
        const deltaNeff = window.BBNGrid.deltaNeffFromS(sValue);
        const point = window.BBNGrid.interpolate(grid, {
          eta10,
          DeltaNeff: deltaNeff,
          tau_n: tauN,
        });
        const state = evaluate(point);

        for (const view of goalViews) {
          const value = state.values[view.goal.key];
          const hit = isInside(value, view.goal.gate);
          setGoalMarker(view, goalPercent(value, view.goal), view.goal.format(value), hit);
        }

        if (config.showDeltaNeff) {
          params.innerHTML = `ΔN<sub>eff</sub> = ${formatFixed(deltaNeff, 3)}`;
        }
        verdict.className = `bbn-verdict ${state.ok ? "is-ok" : "is-off"}`;
        verdict.innerHTML = state.ok
          ? "<strong>Попали в первичный состав нашей Вселенной</strong>"
          : `<strong>попаданий: ${state.hits}/${state.total}</strong>`;
      } catch (error) {
        verdict.className = "bbn-verdict is-off";
        verdict.innerHTML = `<strong>Ошибка интерполяции</strong><span>${error.message}</span>`;
      }
    }

    function autoTick(now) {
      const t = (now - autoStartedAt) / 1000;
      const etaValue = window.BBNGrid.clamp(
        STANDARD_PARAMS.eta10 + 1.2 * Math.sin(t),
        PARAM_RANGES.eta10[0],
        PARAM_RANGES.eta10[1]
      );
      const sValue = window.BBNGrid.clamp(
        STANDARD_PARAMS.S + 0.18 * Math.sin(0.7 * t + 1),
        PARAM_RANGES.S[0],
        PARAM_RANGES.S[1]
      );
      const tauValue = window.BBNGrid.clamp(
        STANDARD_PARAMS.tau_n + 6 * Math.sin(0.45 * t + 2),
        PARAM_RANGES.tau_n[0],
        PARAM_RANGES.tau_n[1]
      );
      setRangeValue(eta.input, etaValue);
      setRangeValue(s.input, sValue);
      setRangeValue(tau.input, tauValue);
      update();
      frame = window.requestAnimationFrame(autoTick);
    }

    [eta.input, s.input, tau.input].forEach((input) => {
      input.addEventListener("input", update);
    });

    if (universeButton) {
      universeButton.addEventListener("click", () => {
        stopAuto();
        setRangeValue(eta.input, STANDARD_PARAMS.eta10);
        setRangeValue(s.input, STANDARD_PARAMS.S);
        setRangeValue(tau.input, STANDARD_PARAMS.tau_n);
        update();
      });
    }

    if (autoButton && stopButton) {
      autoButton.addEventListener("click", () => {
        stopAuto();
        autoStartedAt = performance.now();
        autoButton.disabled = true;
        stopButton.disabled = false;
        frame = window.requestAnimationFrame(autoTick);
      });
      stopButton.addEventListener("click", stopAuto);
      stopButton.disabled = true;
    }

    update();
    root.cleanup = stopAuto;
    return root;
  }

  window.BBNUI = {
    createApp,
    evaluate,
  };
})();
