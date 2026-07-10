(function () {
  "use strict";

  const TARGET_R_HE = [0.3, 0.36];
  const TARGET_D_H = [2.2e-5, 2.8e-5];
  const D_H_RANGE = [1e-6, 1e-4];
  const R_HE_RANGE = [0, 1];

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

  function setRangeValue(input, value) {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
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

  function createScale(titleHtml, rangeHtml, target, markerText) {
    const scale = el("div", "bbn-scale");
    const head = el("div", "bbn-scale-head");
    head.append(htmlEl("span", "bbn-scale-title", titleHtml), htmlEl("span", "bbn-scale-range", rangeHtml));
    const track = el("div", "bbn-scale-track");
    const band = el("div", "bbn-target-band");
    const marker = el("div", "bbn-marker");
    marker.setAttribute("aria-label", markerText);
    const label = el("div", "bbn-marker-label", "—");
    track.append(band, marker, label);
    scale.append(head, track);
    return { scale, band, marker, label };
  }

  function setBand(element, leftPct, rightPct) {
    element.style.left = `${leftPct}%`;
    element.style.width = `${Math.max(0, rightPct - leftPct)}%`;
  }

  function setMarker(marker, label, percent, text) {
    marker.style.left = `${percent}%`;
    label.style.left = `${percent}%`;
    label.textContent = text;
  }

  function classify(rHe, dH) {
    const heliumOk = rHe >= TARGET_R_HE[0] && rHe <= TARGET_R_HE[1];
    const deuteriumOk = dH >= TARGET_D_H[0] && dH <= TARGET_D_H[1];
    if (heliumOk && deuteriumOk) {
      return {
        ok: true,
        title: "Похоже на нашу Вселенную",
        details: "R<sub>He</sub> и D/H попали в целевые полосы.",
      };
    }
    const parts = [];
    if (rHe < TARGET_R_HE[0]) parts.push("гелия мало");
    if (rHe > TARGET_R_HE[1]) parts.push("гелия много");
    if (dH < TARGET_D_H[0]) parts.push("дейтерия мало");
    if (dH > TARGET_D_H[1]) parts.push("дейтерия много");
    return {
      ok: false,
      title: "Не наша Вселенная",
      details: parts.join(", "),
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
    const etaMin = axes.eta10[0];
    const etaMax = axes.eta10[axes.eta10.length - 1];
    const tauMin = axes.tau_n[0];
    const tauMax = axes.tau_n[axes.tau_n.length - 1];
    const sAxis = Array.isArray(axes.S) && axes.S.length === axes.DeltaNeff.length
      ? axes.S
      : axes.DeltaNeff.map(window.BBNGrid.sFromDeltaNeff);
    const sMin = sAxis[0];
    const sMax = sAxis[sAxis.length - 1];
    const config = {
      className: "",
      kicker: "Большой взрыв: нуклеосинтез",
      title: "Синтезируй лёгкие элементы",
      subtitle:
        "Настрой плотность барионов, скорость расширения и время жизни нейтрона так, чтобы попасть в наблюдаемые полосы.",
      initial: {
        eta10: etaMin,
        S: sMax,
        tau_n: tauMax,
      },
      showUniverseButton: true,
      showAutoButtons: true,
      showDeltaNeff: false,
      footerHtml: "",
      ...options,
    };
    config.initial = {
      eta10: etaMin,
      S: sMax,
      tau_n: tauMax,
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
      etaMin,
      etaMax,
      0.01,
      window.BBNGrid.clamp(config.initial.eta10, etaMin, etaMax),
      (v) => formatFixed(v, 2)
    );
    const s = createControl(
      "S = H/H<sub>std</sub>",
      sMin,
      sMax,
      0.001,
      window.BBNGrid.clamp(config.initial.S, sMin, sMax),
      (v) => formatFixed(v, 3)
    );
    const tau = createControl(
      "τ<sub>n</sub>",
      tauMin,
      tauMax,
      0.1,
      window.BBNGrid.clamp(config.initial.tau_n, tauMin, tauMax),
      (v) => `${formatFixed(v, 1)} с`
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

    const rScale = createScale("R<sub>He</sub> = M(<sup>4</sup>He)/M(H)", "0–1", TARGET_R_HE, "R_He marker");
    setBand(
      rScale.band,
      linearPercent(TARGET_R_HE[0], R_HE_RANGE),
      linearPercent(TARGET_R_HE[1], R_HE_RANGE)
    );
    const dScale = createScale("D/H по числу", "10<sup>−6</sup>–10<sup>−4</sup>", TARGET_D_H, "D/H marker");
    setBand(
      dScale.band,
      logPercent(TARGET_D_H[0], D_H_RANGE),
      logPercent(TARGET_D_H[1], D_H_RANGE)
    );

    const values = el("div", "bbn-values");
    const verdict = el("div", "bbn-verdict");
    results.append(rScale.scale, dScale.scale, values, verdict);
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
        const rHe = point.Yp / (1 - point.Yp);
        const state = classify(rHe, point.D_H);

        setMarker(rScale.marker, rScale.label, linearPercent(rHe, R_HE_RANGE), formatFixed(rHe, 3));
        setMarker(dScale.marker, dScale.label, logPercent(point.D_H, D_H_RANGE), formatScientific(point.D_H));

        if (config.showDeltaNeff) {
          params.innerHTML = `ΔN<sub>eff</sub> = ${formatFixed(deltaNeff, 3)}`;
        }
        values.innerHTML = `
          <div><span>Y<sub>p</sub></span><strong>${formatFixed(point.Yp, 4)}</strong></div>
          <div><span>R<sub>He</sub></span><strong>${formatFixed(rHe, 3)}</strong></div>
          <div><span>D/H</span><strong>${formatScientific(point.D_H)}</strong></div>
          <div><span><sup>3</sup>He/H</span><strong>${formatScientific(point.He3_H)}</strong></div>
          <div><span><sup>7</sup>Li/H</span><strong>${formatScientific(point.Li7_H)}</strong></div>
        `;
        verdict.className = `bbn-verdict ${state.ok ? "is-ok" : "is-off"}`;
        verdict.innerHTML = `<strong>${state.title}</strong><span>${state.details}</span>`;
      } catch (error) {
        verdict.className = "bbn-verdict is-off";
        verdict.innerHTML = `<strong>Ошибка интерполяции</strong><span>${error.message}</span>`;
      }
    }

    function autoTick(now) {
      const t = (now - autoStartedAt) / 1000;
      const etaValue = window.BBNGrid.clamp(6.1 + 1.2 * Math.sin(t), etaMin, etaMax);
      const sValue = window.BBNGrid.clamp(1.0 + 0.18 * Math.sin(0.7 * t + 1), sMin, sMax);
      const tauValue = window.BBNGrid.clamp(880 + 6 * Math.sin(0.45 * t + 2), tauMin, tauMax);
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
        setRangeValue(eta.input, 6.1);
        setRangeValue(s.input, 1.0);
        setRangeValue(tau.input, 880);
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
    classify,
  };
})();
