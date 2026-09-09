(function () {
  "use strict";

  const AUTOPLAY_DURATION = 20;
  const HIGH_T_DURATION = 8;
  const LOW_T_PERIOD = 3;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothstep = (value) => {
    const x = clamp01(value);
    return x * x * (3 - 2 * x);
  };
  const potential = (ncs) => Math.sin(Math.PI * ncs) ** 2;
  const transitionProgress = (elapsed) => {
    if (elapsed < 2) return 0.44 * smoothstep(elapsed / 2);
    if (elapsed < 3) return 0.44 + 0.12 * smoothstep(elapsed - 2);
    return 0.56 + 0.44 * smoothstep((elapsed - 3) / 2);
  };

  function create(host, options) {
    const d3 = options && options.d3;
    if (!d3) throw new Error("D3 is required for the sphaleron transition applet.");

    host.innerHTML = `
      <section class="sphaleron-app" aria-label="Интерактивная схема сфалеронного перехода">
        <div class="sphaleron-toolbar">
          <div class="sphaleron-actions" aria-label="Воспроизведение">
            <button type="button" data-action="play">▶ Пуск</button>
            <button type="button" data-action="reset">Сначала</button>
            <button type="button" data-action="scenario">Сценарий 20 с</button>
          </div>
          <div class="sphaleron-temperature" role="group" aria-label="Температурный режим">
            <span class="sphaleron-temperature-label">Режим:</span>
            <button type="button" data-mode="low" aria-pressed="true">Низкая T</button>
            <button type="button" data-mode="high" aria-pressed="false">Высокая T</button>
          </div>
        </div>
        <div class="sphaleron-live" aria-live="polite"></div>
        <div class="sphaleron-figure"></div>
      </section>`;

    const root = host.querySelector(".sphaleron-app");
    const figure = root.querySelector(".sphaleron-figure");
    const live = root.querySelector(".sphaleron-live");
    const playButton = root.querySelector('[data-action="play"]');
    const resetButton = root.querySelector('[data-action="reset"]');
    const scenarioButton = root.querySelector('[data-action="scenario"]');
    const modeButtons = Array.from(root.querySelectorAll("[data-mode]"));

    const svg = d3.select(figure)
      .append("svg")
      .attr("role", "img")
      .attr("aria-labelledby", "sphaleron-svg-title sphaleron-svg-desc");

    svg.append("title")
      .attr("id", "sphaleron-svg-title")
      .text("Сфалеронный переход между соседними электрослабыми вакуумными конфигурациями");
    svg.append("desc")
      .attr("id", "sphaleron-svg-desc")
      .text("Периодический энергетический барьер в координате Черна — Саймонса. Конфигурация полей остаётся около минимума при низкой температуре и преодолевает барьер при высокой температуре.");

    const defs = svg.append("defs");
    [
      ["sph-arrow-purple", "var(--sph-purple)"],
      ["sph-arrow-green", "var(--sph-green)"]
    ].forEach(([id, color]) => {
      defs.append("marker")
        .attr("id", id)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 9)
        .attr("refY", 0)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });

    const sceneLayer = svg.append("g");

    const state = {
      mode: "low",
      time: 0,
      running: false,
      lastTimestamp: null,
      frame: null,
      destroyed: false,
      lastAnnouncement: ""
    };

    function autoplayScene(time) {
      if (time < 3) {
        return {
          stateName: "LOW_T",
          ncs: 0,
          title: "Соседние вакуумные конфигурации",
          subtitle: "Целые значения N_CS соответствуют минимумам энергии",
          barrier: 0,
          tunnel: 0,
          deltas: 0,
          directions: 0
        };
      }
      if (time < 6) {
        return {
          stateName: "LOW_T",
          ncs: 0,
          title: "Между вакуумами есть барьер",
          subtitle: "На вершине находится сфалерон",
          barrier: smoothstep((time - 3) / 1.4),
          tunnel: 0,
          deltas: 0,
          directions: 0
        };
      }
      if (time < 9) {
        return {
          stateName: "LOW_T",
          ncs: 0.055 * Math.sin((time - 6) * Math.PI * 2.2),
          title: "При низкой температуре переходы чрезвычайно редки",
          subtitle: "Квантовое туннелирование и термоактивация сильно подавлены",
          barrier: 0.25,
          tunnel: smoothstep((time - 6) / 0.8),
          deltas: 0,
          directions: 0
        };
      }
      if (time < 14) {
        const progress = transitionProgress(time - 9);
        return {
          stateName: progress < 0.02 ? "HEATING" : progress < 0.43 ? "CLIMB" : progress < 0.57 ? "SPHALERON" : "DESCENT",
          ncs: progress,
          title: "Высокая температура",
          subtitle: "Тепловые флуктуации позволяют конфигурации преодолеть барьер",
          barrier: Math.max(0.25, 1 - Math.abs(progress - 0.5) * 2),
          tunnel: 0,
          deltas: 0,
          directions: 0
        };
      }
      if (time < 17) {
        return {
          stateName: "NEW_VACUUM",
          ncs: 1,
          title: "Переход завершён",
          subtitle: "Изменения относятся ко всему переходу, а не к точке на вершине",
          barrier: 0,
          tunnel: 0,
          deltas: smoothstep((time - 14) / 0.8),
          directions: 0
        };
      }
      return {
        stateName: "REVERSE",
        ncs: 1,
        title: "Оба направления возможны",
        subtitle: "Без предпочтения направления нет систематического роста B",
        barrier: 0,
        tunnel: 0,
        deltas: 0,
        directions: smoothstep((time - 17) / 0.8)
      };
    }

    function lowTemperatureScene(time) {
      return {
        stateName: "LOW_T",
        ncs: 0.055 * Math.sin(time * Math.PI * 2.2),
        title: "Низкая температура",
        subtitle: "Переходы между вакуумами чрезвычайно редки",
        barrier: 0,
        tunnel: 0.8,
        deltas: 0,
        directions: 0
      };
    }

    function highTemperatureScene(time) {
      if (time < 5) {
        const progress = transitionProgress(time);
        return {
          stateName: progress < 0.02 ? "HEATING" : progress < 0.43 ? "CLIMB" : progress < 0.57 ? "SPHALERON" : "DESCENT",
          ncs: progress,
          title: "Высокая температура",
          subtitle: "Тепловые флуктуации позволяют конфигурации преодолеть барьер",
          barrier: Math.max(0.25, 1 - Math.abs(progress - 0.5) * 2),
          tunnel: 0,
          deltas: 0,
          directions: 0
        };
      }
      return {
        stateName: "NEW_VACUUM",
        ncs: 1,
        title: "Переход завершён",
        subtitle: "Изменения относятся ко всему переходу",
        barrier: 0,
        tunnel: 0,
        deltas: smoothstep((time - 5) / 0.8),
        directions: 0
      };
    }

    function currentScene() {
      if (state.mode === "autoplay") return autoplayScene(state.time);
      if (state.mode === "high") return highTemperatureScene(state.time);
      return lowTemperatureScene(state.time);
    }

    function layoutForWidth(width) {
      if (width < 760) {
        return {
          width: 480,
          height: 780,
          plot: {left: 42, right: 452, top: 160, bottom: 430},
          info: {x: 54, y: 500},
          noteY: 750,
          narrow: true
        };
      }
      return {
        width: 1200,
        height: 675,
        plot: {left: 86, right: 825, top: 125, bottom: 505},
        info: {x: 900, y: 210},
        noteY: 650,
        narrow: false
      };
    }

    function appendWrappedText(layer, config) {
      const text = layer.append("text")
        .attr("class", config.className)
        .attr("x", config.x)
        .attr("y", config.y)
        .attr("text-anchor", config.anchor || "start");
      const words = config.text.split(/\s+/);
      let line = [];
      let lineNumber = 0;
      let tspan = text.append("tspan")
        .attr("x", config.x)
        .attr("y", config.y);

      words.forEach((word) => {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > config.maxWidth && line.length > 1) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          lineNumber += 1;
          tspan = text.append("tspan")
            .attr("x", config.x)
            .attr("y", config.y + lineNumber * config.lineHeight)
            .text(word);
        }
      });
      return lineNumber + 1;
    }

    function draw() {
      if (state.destroyed) return;
      const width = Math.max(320, figure.getBoundingClientRect().width || 1200);
      const layout = layoutForWidth(width);
      const {plot} = layout;
      const scene = currentScene();

      root.dataset.state = scene.stateName;
      svg.attr("viewBox", `0 0 ${layout.width} ${layout.height}`);
      sceneLayer.selectAll("*").remove();

      const x = d3.scaleLinear().domain([-1.15, 2.15]).range([plot.left, plot.right]);
      const y = d3.scaleLinear().domain([-0.08, 1.18]).range([plot.bottom, plot.top]);
      const curveData = d3.range(-1.15, 2.151, 0.01).map((ncs) => ({ncs, energy: potential(ncs)}));
      const line = d3.line()
        .x((d) => x(d.ncs))
        .y((d) => y(d.energy));

      const titleY = layout.narrow ? 36 : 52;
      const titleLines = appendWrappedText(sceneLayer, {
        className: "sph-phase-title",
        x: plot.left,
        y: titleY,
        text: scene.title,
        maxWidth: plot.right - plot.left,
        lineHeight: layout.narrow ? 31 : 34
      });
      appendWrappedText(sceneLayer, {
        className: "sph-phase-subtitle",
        x: plot.left,
        y: titleY + titleLines * (layout.narrow ? 32 : 34),
        text: scene.subtitle,
        maxWidth: plot.right - plot.left,
        lineHeight: layout.narrow ? 22 : 24
      });

      [0, 0.5, 1].forEach((energy) => {
        sceneLayer.append("line")
          .attr("class", "sph-guide")
          .attr("x1", plot.left)
          .attr("x2", plot.right)
          .attr("y1", y(energy))
          .attr("y2", y(energy));
      });

      sceneLayer.append("path")
        .datum(curveData)
        .attr("class", "sph-potential")
        .attr("d", line);

      const axis = d3.axisBottom(x)
        .tickValues([-1, -0.5, 0, 0.5, 1, 1.5, 2])
        .tickFormat((value) => Number.isInteger(value) ? String(value) : "");
      sceneLayer.append("g")
        .attr("class", "sph-axis")
        .attr("transform", `translate(0,${y(0)})`)
        .call(axis);
      sceneLayer.append("text")
        .attr("class", "sph-axis-title")
        .attr("x", plot.right)
        .attr("y", y(0) + 50)
        .attr("text-anchor", "end")
        .text("N_CS");
      sceneLayer.append("text")
        .attr("class", "sph-energy-label")
        .attr("x", plot.left)
        .attr("y", plot.top - 18)
        .text("E / Esph");

      [-1, 0, 1, 2].forEach((value) => {
        sceneLayer.append("circle")
          .attr("class", "sph-minimum")
          .attr("cx", x(value))
          .attr("cy", y(0))
          .attr("r", 7);
        sceneLayer.append("text")
          .attr("class", "sph-minimum-label")
          .attr("x", x(value))
          .attr("y", y(0) + 27)
          .attr("text-anchor", "middle")
          .text(layout.narrow ? `вак. ${value}` : `вакуум ${value}`);
      });

      const barrierX = x(0.5);
      const barrierY = y(1);
      const barrierGroup = sceneLayer.append("g")
        .attr("opacity", scene.barrier);
      barrierGroup.append("circle")
        .attr("class", "sph-sphaleron-glow")
        .attr("cx", barrierX)
        .attr("cy", barrierY)
        .attr("r", 33 + 8 * scene.barrier);
      barrierGroup.append("text")
        .attr("class", "sph-sphaleron-label")
        .attr("x", barrierX)
        .attr("y", barrierY - 52)
        .attr("text-anchor", "middle")
        .text("сфалерон");
      barrierGroup.append("text")
        .attr("class", "sph-sphaleron-note")
        .attr("x", barrierX)
        .attr("y", barrierY - 29)
        .attr("text-anchor", "middle")
        .text("неустойчивая конфигурация полей");

      const tunnelStart = x(0) + 12;
      const tunnelEnd = x(1) - 12;
      const tunnelTop = y(0.72);
      const tunnelPath = `M${tunnelStart},${y(0) - 12} Q${(tunnelStart + tunnelEnd) / 2},${tunnelTop} ${tunnelEnd},${y(0) - 12}`;
      const tunnelGroup = sceneLayer.append("g").attr("opacity", scene.tunnel);
      tunnelGroup.append("path")
        .attr("class", "sph-tunnel")
        .attr("d", tunnelPath)
        .attr("marker-end", "url(#sph-arrow-purple)");
      tunnelGroup.append("text")
        .attr("class", "sph-tunnel-label")
        .attr("x", (tunnelStart + tunnelEnd) / 2)
        .attr("y", tunnelTop - 12)
        .attr("text-anchor", "middle")
        .text("туннелирование сильно подавлено");

      const markerX = x(scene.ncs);
      const markerY = y(potential(scene.ncs));
      sceneLayer.append("circle")
        .attr("class", "sph-marker-halo")
        .attr("cx", markerX)
        .attr("cy", markerY)
        .attr("r", scene.stateName === "SPHALERON" ? 30 : 24);
      sceneLayer.append("circle")
        .attr("class", "sph-marker")
        .attr("cx", markerX)
        .attr("cy", markerY)
        .attr("r", 10);
      const markerLabelAtMinimum = scene.stateName === "LOW_T";
      const markerLabelOnLeft = !markerLabelAtMinimum && scene.stateName !== "SPHALERON" && scene.ncs > 0.68;
      sceneLayer.append("text")
        .attr("class", "sph-marker-label")
        .attr("x", markerLabelAtMinimum ? markerX : markerX + (markerLabelOnLeft ? -17 : 17))
        .attr("y", markerLabelAtMinimum ? y(0) + (layout.narrow ? 58 : 62) : markerY + (scene.stateName === "SPHALERON" ? 31 : -15))
        .attr("text-anchor", markerLabelAtMinimum ? "middle" : markerLabelOnLeft ? "end" : "start")
        .text("конфигурация полей");

      drawInfo(sceneLayer, layout, scene);
      drawDirections(sceneLayer, layout, x, y, scene);

      appendWrappedText(sceneLayer, {
        className: "sph-scheme-note",
        x: layout.width / 2,
        y: layout.noteY,
        text: "Схема конфигурационного пространства · высота барьера и время условны",
        maxWidth: layout.width - 32,
        lineHeight: layout.narrow ? 20 : 18,
        anchor: "middle"
      });

      const announcement = `${scene.title}. ${scene.subtitle}`;
      if (announcement !== state.lastAnnouncement) {
        live.textContent = announcement;
        state.lastAnnouncement = announcement;
      }
      updateControls();
    }

    function drawInfo(layer, layout, scene) {
      const formulaStart = layout.narrow ? 35 : 47;
      const formulaStep = layout.narrow ? 34 : 48;
      const generationsY = layout.narrow ? 175 : 245;
      const group = layer.append("g")
        .attr("transform", `translate(${layout.info.x},${layout.info.y})`)
        .attr("opacity", scene.deltas);
      group.append("text")
        .attr("class", "sph-info-title")
        .attr("y", 0)
        .text("Изменение за переход");
      [
        ["ΔN_CS = +1", false],
        ["ΔB = +3", true],
        ["ΔL = +3", true],
        ["Δ(B−L) = 0", false]
      ].forEach(([label, emphasis], index) => {
        group.append("text")
          .attr("class", `sph-formula${emphasis ? " sph-formula-emphasis" : ""}`)
          .attr("y", formulaStart + index * formulaStep)
          .text(label);
      });
      group.append("text")
        .attr("class", "sph-generations")
        .attr("y", generationsY)
        .text("3 — число поколений фермионов");
    }

    function drawDirections(layer, layout, x, y, scene) {
      const group = layer.append("g").attr("opacity", scene.directions);
      const yForward = layout.narrow ? 474 : 555;
      const yBackward = yForward + 35;
      const start = x(0) + 18;
      const end = x(1) - 18;
      group.append("text")
        .attr("class", "sph-info-title")
        .attr("x", start)
        .attr("y", yForward - 22)
        .text("Альтернативные направления перехода");
      group.append("line")
        .attr("class", "sph-direction sph-direction-forward")
        .attr("x1", start)
        .attr("x2", end)
        .attr("y1", yForward)
        .attr("y2", yForward)
        .attr("marker-end", "url(#sph-arrow-green)");
      group.append("text")
        .attr("class", "sph-direction-label")
        .attr("x", (start + end) / 2)
        .attr("y", yForward - 8)
        .attr("text-anchor", "middle")
        .text("0 → 1:  ΔB = ΔL = +3");
      group.append("line")
        .attr("class", "sph-direction sph-direction-backward")
        .attr("x1", end)
        .attr("x2", start)
        .attr("y1", yBackward)
        .attr("y2", yBackward)
        .attr("marker-end", "url(#sph-arrow-purple)");
      group.append("text")
        .attr("class", "sph-direction-label")
        .attr("x", (start + end) / 2)
        .attr("y", yBackward + 22)
        .attr("text-anchor", "middle")
        .text("1 → 0:  ΔB = ΔL = −3");
      appendWrappedText(group, {
        className: "sph-final-message",
        x: layout.narrow ? layout.width / 2 : layout.info.x,
        y: layout.narrow ? 630 : 510,
        text: "Без предпочтения направления избыток вещества не возникает",
        maxWidth: layout.narrow ? layout.width - 70 : layout.width - layout.info.x - 24,
        lineHeight: 24,
        anchor: layout.narrow ? "middle" : "start"
      });
      group.append("text")
        .attr("class", "sph-formula")
        .attr("x", layout.narrow ? layout.width / 2 : layout.info.x)
        .attr("y", layout.narrow ? 695 : 553)
        .attr("text-anchor", layout.narrow ? "middle" : "start")
        .text("B − L = const");
    }

    function updateControls() {
      playButton.textContent = state.running ? "❚❚ Пауза" : "▶ Пуск";
      playButton.setAttribute("aria-pressed", state.running ? "true" : "false");
      modeButtons.forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.mode === state.mode ? "true" : "false");
      });
    }

    function stop() {
      state.running = false;
      state.lastTimestamp = null;
      if (state.frame !== null) cancelAnimationFrame(state.frame);
      state.frame = null;
      updateControls();
    }

    function start() {
      if (state.destroyed || state.running) return;
      if (state.mode === "autoplay" && state.time >= AUTOPLAY_DURATION) state.time = 0;
      if (state.mode === "high" && state.time >= HIGH_T_DURATION) state.time = 0;
      state.running = true;
      state.lastTimestamp = null;
      updateControls();
      state.frame = requestAnimationFrame(tick);
    }

    function tick(timestamp) {
      if (!state.running || state.destroyed) {
        state.frame = null;
        return;
      }
      if (state.lastTimestamp === null) state.lastTimestamp = timestamp;
      const delta = Math.min(0.05, (timestamp - state.lastTimestamp) / 1000);
      state.lastTimestamp = timestamp;
      state.time += delta;

      if (state.mode === "low") {
        state.time %= LOW_T_PERIOD;
      } else if (state.mode === "high" && state.time >= HIGH_T_DURATION) {
        state.time = HIGH_T_DURATION;
        stop();
      } else if (state.mode === "autoplay" && state.time >= AUTOPLAY_DURATION) {
        state.time = AUTOPLAY_DURATION;
        stop();
      }

      draw();
      if (state.running) state.frame = requestAnimationFrame(tick);
    }

    playButton.addEventListener("click", () => {
      if (state.running) stop();
      else start();
    });
    resetButton.addEventListener("click", () => {
      stop();
      state.time = 0;
      draw();
    });
    scenarioButton.addEventListener("click", () => {
      stop();
      state.mode = "autoplay";
      state.time = 0;
      draw();
      start();
    });
    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        stop();
        state.mode = button.dataset.mode;
        state.time = 0;
        draw();
        start();
      });
    });

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(figure);

    const params = new URLSearchParams(window.location.search);
    const shouldAutoplay = params.has("autoplay") || params.get("mode") === "autoplay";
    state.mode = shouldAutoplay ? "autoplay" : "low";
    draw();
    if (shouldAutoplay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) start();

    return {
      destroy() {
        state.destroyed = true;
        stop();
        resizeObserver.disconnect();
        host.replaceChildren();
      }
    };
  }

  window.SphaleronTransitionApp = {create};
})();
