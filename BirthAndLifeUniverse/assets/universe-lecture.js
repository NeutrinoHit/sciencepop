(function () {
  const NS = "http://www.w3.org/2000/svg";
  let slideVideoPlaybackReady = false;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function hash(seed) {
    let x = seed >>> 0;
    return function () {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) / 4294967295);
    };
  }

  function svg(body, label = "Universe lecture visualization") {
    return `
      <svg viewBox="0 0 940 500" role="img" aria-label="${escapeHtml(label)}">
        <defs>
          <marker id="u-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#f4f7fb"></path>
          </marker>
          <filter id="u-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="5" result="blur"></feGaussianBlur>
            <feMerge>
              <feMergeNode in="blur"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
          <radialGradient id="u-hot" cx="50%" cy="50%" r="62%">
            <stop offset="0%" stop-color="#fff2b8"></stop>
            <stop offset="36%" stop-color="#ff9f5a"></stop>
            <stop offset="72%" stop-color="#a34cff"></stop>
            <stop offset="100%" stop-color="#15233a"></stop>
          </radialGradient>
          <linearGradient id="u-temp" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#fff2b8"></stop>
            <stop offset="30%" stop-color="#ff8f70"></stop>
            <stop offset="62%" stop-color="#76c7ff"></stop>
            <stop offset="100%" stop-color="#111827"></stop>
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="924" height="484" rx="18" class="u-frame"></rect>
        ${body}
      </svg>
    `;
  }

  function stars(seed, count, options = {}) {
    const rand = hash(seed);
    const xmin = options.xmin ?? 40;
    const xmax = options.xmax ?? 900;
    const ymin = options.ymin ?? 46;
    const ymax = options.ymax ?? 452;
    const color = options.color ?? "#f4f7fb";
    let out = "";
    for (let i = 0; i < count; i += 1) {
      const x = xmin + rand() * (xmax - xmin);
      const y = ymin + rand() * (ymax - ymin);
      const r = (options.radius ?? 1.2) * (0.45 + 1.9 * rand());
      const opacity = 0.25 + 0.72 * rand();
      const delay = (-rand() * 5).toFixed(2);
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${opacity.toFixed(2)}" class="u-fade" style="animation-delay:${delay}s"></circle>`;
    }
    return out;
  }

  function wavePath(x, y, width, amp, cycles) {
    const segments = cycles * 2;
    const step = width / segments;
    let d = `M ${x} ${y}`;
    for (let i = 0; i < segments; i += 1) {
      const sign = i % 2 === 0 ? -1 : 1;
      const x1 = x + step * i;
      d += ` Q ${(x1 + step / 2).toFixed(1)} ${(y + sign * amp).toFixed(1)} ${(x1 + step).toFixed(1)} ${y}`;
    }
    return d;
  }

  function radialWavePath(x1, y1, x2, y2, amp, cycles) {
    const segments = cycles * 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    let d = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    for (let i = 0; i < segments; i += 1) {
      const t1 = (i + 0.5) / segments;
      const t2 = (i + 1) / segments;
      const sign = i % 2 === 0 ? 1 : -1;
      const cx = x1 + dx * t1 + nx * amp * sign;
      const cy = y1 + dy * t1 + ny * amp * sign;
      const ex = x1 + dx * t2;
      const ey = y1 + dy * t2;
      d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    }
    return d;
  }

  const viz = {
    titleUniverse() {
      const rand = hash(2107);
      const dots = Array.from({ length: 95 }, (_, i) => {
        const angle = rand() * Math.PI * 2;
        const radius = 42 + rand() * 220;
        const x = 470 + Math.cos(angle) * radius;
        const y = 250 + Math.sin(angle) * radius * 0.62;
        const r = 1.2 + rand() * 2.8;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#f4f7fb" opacity="${(0.35 + rand() * 0.6).toFixed(2)}"></circle>`;
      }).join("");
      return svg(`
        <circle cx="470" cy="250" r="56" fill="url(#u-hot)" filter="url(#u-glow)" class="u-pulse"></circle>
        <circle cx="470" cy="250" r="120" fill="none" stroke="rgba(118,199,255,0.23)" stroke-width="2" class="u-grow"></circle>
        <circle cx="470" cy="250" r="210" fill="none" stroke="rgba(255,207,112,0.18)" stroke-width="2" class="u-grow" style="animation-delay:-1.4s"></circle>
        ${dots}
        <path d="M 210 250 C 340 126 610 126 730 250 C 610 374 340 374 210 250 Z" class="u-line blue u-dashed u-flow" opacity="0.62"></path>
        <text x="70" y="76" class="u-title">Биография Вселенной</text>
        <text x="70" y="108" class="u-subtitle">расширение, охлаждение, рост структуры</text>
      `, "Animated universe biography title");
    },

    timeline() {
      const items = [
        ["10^-6 с", "частицы"],
        ["3 мин", "первые ядра"],
        ["380 тыс. лет", "первый свет"],
        ["0.2-1 млрд лет", "звезды"],
        ["13.8 млрд лет", "сегодня"]
      ];
      const x0 = 86;
      const y = 255;
      const step = 188;
      const nodes = items.map(([time, label], i) => {
        const x = x0 + i * step;
        const cls = ["u-rose", "u-gold", "u-blue", "u-green", "u-violet"][i];
        return `
          <g>
            <circle cx="${x}" cy="${y}" r="${26 + i * 2}" class="${cls} u-pulse" opacity="0.86" style="animation-delay:${-0.45 * i}s"></circle>
            <text x="${x}" y="${y + 72}" text-anchor="middle" class="u-label">${time}</text>
            <text x="${x}" y="${y + 102}" text-anchor="middle" class="u-small">${label}</text>
          </g>`;
      }).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Время сжато почти до невозможности</text>
        <text x="58" y="104" class="u-subtitle">Первые минуты задают состав вещества, сотни тысяч лет - первый свет, миллиарды лет - структуру.</text>
        <path d="M ${x0} ${y} L 866 ${y}" class="u-line blue u-flow" marker-end="url(#u-arrow)"></path>
        ${nodes}
        <text x="86" y="178" class="u-small">горячо и плотно</text>
        <text x="742" y="178" class="u-small">холоднее и сложнее</text>
      `, "Cosmic timeline");
    },

    expansion() {
      const dots = [[240, 170], [320, 265], [420, 205], [510, 305], [615, 180], [680, 295]];
      const arrows = dots.map(([x, y]) => {
        const dx = (x - 470) * 0.16;
        const dy = (y - 250) * 0.16;
        return `<line x1="${x}" y1="${y}" x2="${x + dx}" y2="${y + dy}" class="u-line gold u-flow" marker-end="url(#u-arrow)"></line>`;
      }).join("");
      const nodes = dots.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${18 + i % 2 * 4}" fill="#76c7ff" opacity="0.82" filter="url(#u-glow)" class="u-drift" style="animation-delay:${-i * 0.7}s"></circle>`).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Большой взрыв - не взрыв в пустоту</text>
        <text x="58" y="104" class="u-subtitle">Увеличивается сама линейка расстояний между далекими галактиками.</text>
        <circle cx="470" cy="250" r="76" fill="rgba(118,199,255,0.08)" stroke="rgba(118,199,255,0.38)" stroke-width="2"></circle>
        <circle cx="470" cy="250" r="150" fill="none" stroke="rgba(255,207,112,0.28)" stroke-width="2" class="u-grow"></circle>
        <circle cx="470" cy="250" r="230" fill="none" stroke="rgba(255,143,159,0.2)" stroke-width="2" class="u-grow" style="animation-delay:-1.2s"></circle>
        ${arrows}
        ${nodes}
        <text x="470" y="254" text-anchor="middle" class="u-small">нет центра внутри</text>
      `, "Expansion of space");
    },

    redBlueShift() {
      return svg(`
        <text x="58" y="70" class="u-title">Одна идея, два направления</text>
        <text x="58" y="104" class="u-subtitle">Сравниваем линии спектра с лабораторным образцом и видим, куда они уехали.</text>

        <rect x="72" y="130" width="796" height="130" rx="16" class="u-panel"></rect>
        <rect x="72" y="290" width="796" height="130" rx="16" class="u-panel"></rect>

        <g transform="translate(204 195)">
          <circle cx="0" cy="0" r="34" fill="url(#u-hot)" filter="url(#u-glow)" class="u-pulse"></circle>
          <path d="M -12 -52 L -24 -76 M 12 -52 L 24 -76 M -48 -12 L -72 -22 M 48 -12 L 72 -22 M -44 25 L -66 42 M 44 25 L 66 42" class="u-line gold" opacity="0.72"></path>
        </g>
        <line x1="184" y1="236" x2="132" y2="236" class="u-line green u-flow" marker-end="url(#u-arrow)"></line>
        <path d="${wavePath(278, 195, 410, 29, 4)}" class="u-line u-draw" style="stroke:#ff4d4d;stroke-width:7;animation-duration:4.8s"></path>
        <g transform="translate(760 195)">
          <circle cx="0" cy="0" r="28" fill="rgba(244,247,251,0.12)" stroke="rgba(244,247,251,0.68)" stroke-width="3"></circle>
          <circle cx="-8" cy="-5" r="5" fill="#f4f7fb"></circle>
          <path d="M 20 18 L 54 44" class="u-line"></path>
        </g>
        <text x="108" y="160" class="u-label">удаляется</text>
        <text x="610" y="242" class="u-rose u-label">волна длиннее: краснее</text>

        <g transform="translate(204 355)">
          <circle cx="0" cy="0" r="34" fill="url(#u-hot)" filter="url(#u-glow)" class="u-pulse" style="animation-delay:-1.2s"></circle>
          <path d="M -12 -52 L -24 -76 M 12 -52 L 24 -76 M -48 -12 L -72 -22 M 48 -12 L 72 -22 M -44 25 L -66 42 M 44 25 L 66 42" class="u-line gold" opacity="0.72"></path>
        </g>
        <line x1="224" y1="396" x2="276" y2="396" class="u-line green u-flow" marker-end="url(#u-arrow)"></line>
        <path d="${wavePath(278, 355, 410, 29, 8)}" class="u-line u-draw" style="stroke:#4d7dff;stroke-width:7;animation-duration:4.0s"></path>
        <g transform="translate(760 355)">
          <circle cx="0" cy="0" r="28" fill="rgba(244,247,251,0.12)" stroke="rgba(244,247,251,0.68)" stroke-width="3"></circle>
          <circle cx="-8" cy="-5" r="5" fill="#f4f7fb"></circle>
          <path d="M 20 18 L 54 44" class="u-line"></path>
        </g>
        <text x="108" y="320" class="u-label">приближается</text>
        <text x="600" y="402" class="u-blue u-label">волна короче: синее</text>
      `, "Redshift and blueshift");
    },

    hubbleLaw() {
      const points = [
        [190, 348, 12, "#f4f7fb", "близко"],
        [310, 306, 15, "#ffb3b3", ""],
        [445, 260, 18, "#ff7777", ""],
        [600, 205, 21, "#ff4d4d", ""],
        [765, 148, 24, "#ff2424", "далеко"]
      ];
      const galaxies = points.map(([x, y, r, color, label], i) => `
        <g class="u-pulse" style="animation-delay:${-i * 0.32}s">
          <circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.9" filter="url(#u-glow)"></circle>
          <path d="M ${x - r * 1.6} ${y} C ${x - r * 0.5} ${y - r * 0.7}, ${x + r * 0.5} ${y + r * 0.7}, ${x + r * 1.6} ${y}" fill="none" stroke="rgba(244,247,251,0.75)" stroke-width="2"></path>
          ${label ? `<text x="${x}" y="${y + 46}" text-anchor="middle" class="u-small">${label}</text>` : ""}
        </g>
      `).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Чем дальше, тем быстрее</text>
        <text x="58" y="104" class="u-subtitle">Это выглядит так, как будто масштаб пространства растет всюду.</text>

        <line x1="118" y1="390" x2="835" y2="390" class="u-line" marker-end="url(#u-arrow)"></line>
        <line x1="118" y1="390" x2="118" y2="118" class="u-line" marker-end="url(#u-arrow)"></line>
        <path d="M 154 360 L 804 128" class="u-line rose u-flow" opacity="0.85"></path>
        ${galaxies}

        <text x="470" y="462" text-anchor="middle" class="u-label">расстояние до галактики</text>
        <text x="58" y="235" transform="rotate(-90 58 235)" text-anchor="middle" class="u-label">скорость удаления</text>
        <text x="555" y="344" class="u-title" style="font-size:38px;fill:#ffcf70">v = H₀ d</text>
        <text x="555" y="380" class="u-small">закон Хаббла - первый рабочий спидометр расширения</text>
      `, "Hubble law");
    },

    sphereSurface() {
      const sphereRadius = 186;
      return svg(`
        <text x="58" y="58" class="u-title">Центр карты выбирает наблюдатель</text>
        <text x="58" y="90" class="u-subtitle">«Мы» стартуем в центре. Через четверть оборота на этом месте оказывается «Они».</text>

        <g data-sphere-surface="1" data-radius="${sphereRadius}" transform="translate(470 296)">
          <circle cx="0" cy="0" r="${sphereRadius}" fill="rgba(118,199,255,0.075)" stroke="rgba(118,199,255,0.58)" stroke-width="3.2"></circle>
          <circle cx="-58" cy="-54" r="96" fill="rgba(244,247,251,0.045)"></circle>
          <line x1="0" y1="${-sphereRadius - 20}" x2="0" y2="${sphereRadius + 20}" class="u-line u-dashed" opacity="0.2"></line>
          <text x="14" y="${-sphereRadius - 10}" class="u-small" style="fill:rgba(197,207,221,0.72)">ось Z</text>
          <g data-sphere-grid="1"></g>
          <g data-sphere-galaxies="1"></g>
          <g data-sphere-observers="1"></g>
        </g>

      `, "Rotating sphere surface with relative observers");
    },

    cooling() {
      const ticks = [
        [92, "раньше", "горячее"],
        [306, "ядра", "минуты"],
        [520, "атомы", "380 тыс. лет"],
        [735, "звезды", "позже"]
      ];
      const labels = ticks.map(([x, a, b]) => `
        <line x1="${x}" y1="325" x2="${x}" y2="346" stroke="rgba(244,247,251,0.55)" stroke-width="2"></line>
        <text x="${x}" y="382" text-anchor="middle" class="u-label">${a}</text>
        <text x="${x}" y="410" text-anchor="middle" class="u-small">${b}</text>`).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Расширение работает как охлаждение</text>
        <text x="58" y="104" class="u-subtitle">Длиннее волны света - ниже температура излучения.</text>
        <rect x="90" y="220" width="760" height="58" rx="29" fill="url(#u-temp)"></rect>
        <path d="M 112 300 C 245 236 374 232 505 290 C 648 354 744 282 828 238" class="u-line blue u-draw"></path>
        <path d="M 118 300 C 238 268 344 268 454 300 C 600 344 728 326 830 300" class="u-line gold u-draw" style="animation-delay:-1.8s"></path>
        ${labels}
        <text x="112" y="190" class="u-rose u-label">плотная плазма</text>
        <text x="682" y="190" class="u-blue u-label">разреженный космос</text>
      `, "Cooling universe");
    },

    particleSoup() {
      const rand = hash(77);
      const particles = Array.from({ length: 72 }, (_, i) => {
        const x = 95 + rand() * 750;
        const y = 135 + rand() * 280;
        const r = 5 + rand() * 11;
        const cls = ["u-blue", "u-gold", "u-rose", "u-green"][i % 4];
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" class="${cls} u-drift" opacity="0.78" style="animation-delay:${(-rand() * 4).toFixed(2)}s"></circle>`;
      }).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Сначала нет привычных предметов</text>
        <text x="58" y="104" class="u-subtitle">Есть горячая смесь частиц, античастиц и света.</text>
        <rect x="76" y="126" width="788" height="302" rx="18" class="u-panel"></rect>
        ${particles}
        <path d="M 210 232 L 292 232" class="u-line blue u-flow" marker-end="url(#u-arrow)"></path>
        <path d="M 650 304 L 568 304" class="u-line rose u-flow" marker-end="url(#u-arrow)"></path>
        <text x="360" y="242" class="u-label">свет рождает пары</text>
        <text x="354" y="318" class="u-label">пары снова дают свет</text>
      `, "Early particle plasma");
    },

    asymmetry() {
      const rows = Array.from({ length: 7 }, (_, j) => {
        const y = 130 + j * 38;
        return Array.from({ length: 13 }, (_, i) => {
          const x = 120 + i * 50;
          const matter = (i + j) % 2 === 0;
          const color = matter ? "#76c7ff" : "#ff8f9f";
          const symbol = matter ? "M" : "A";
          const fade = i > 8 && !matter ? "u-fade" : "";
          return `<g class="${fade}" style="animation-delay:${-(i + j) * 0.08}s">
            <circle cx="${x}" cy="${y}" r="16" fill="${color}" opacity="${matter ? 0.88 : 0.72}"></circle>
            <text x="${x}" y="${y + 6}" text-anchor="middle" font-size="15" font-weight="800" fill="#07101b">${symbol}</text>
          </g>`;
        }).join("");
      }).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Материи осталось чуть-чуть больше</text>
        <text x="58" y="104" class="u-subtitle">Почти вся материя и антиматерия аннигилировали. Малый остаток стал всем видимым веществом.</text>
        ${rows}
        <path d="M 170 430 L 770 430" class="u-line gold u-flow" marker-end="url(#u-arrow)"></path>
        <text x="470" y="466" text-anchor="middle" class="u-label">из микроскопического перевеса получился космос с атомами</text>
      `, "Matter antimatter asymmetry");
    },

    neutrinos() {
      const lines = Array.from({ length: 14 }, (_, i) => {
        const y = 120 + i * 24;
        const x1 = 150 + (i % 3) * 20;
        const x2 = 810 - (i % 4) * 14;
        return `<path d="M ${x1} ${y} C 330 ${y - 65}, 610 ${y + 72}, ${x2} ${y + 10}" class="u-line blue u-flow" opacity="0.55" style="animation-delay:${-i * 0.18}s"></path>`;
      }).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Нейтрино рано уходят в свободный полет</text>
        <text x="58" y="104" class="u-subtitle">Они почти не трогают вещество, поэтому должны нести очень древний след.</text>
        <circle cx="280" cy="260" r="116" fill="rgba(255,143,159,0.14)" stroke="rgba(255,143,159,0.45)" stroke-width="2" class="u-pulse"></circle>
        <circle cx="280" cy="260" r="72" fill="rgba(255,207,112,0.13)" stroke="rgba(255,207,112,0.5)" stroke-width="2"></circle>
        ${lines}
        <text x="206" y="266" class="u-label">плазма</text>
        <text x="618" y="392" class="u-blue u-label">свободный полет</text>
      `, "Relic neutrinos");
    },

    nuclei() {
      const nuclei = [
        [170, 230, "H", "#76c7ff", 1],
        [330, 230, "D", "#8fe3a2", 2],
        [510, 230, "He", "#ffcf70", 4],
        [700, 230, "Li", "#c3a5ff", 7]
      ];
      const nodes = nuclei.map(([x, y, label, color, mass], i) => `
        <g class="u-pulse" style="animation-delay:${-i * 0.48}s">
          <circle cx="${x}" cy="${y}" r="${35 + mass * 2}" fill="${color}" opacity="0.85" filter="url(#u-glow)"></circle>
          <text x="${x}" y="${y + 10}" text-anchor="middle" font-size="29" font-weight="900" fill="#07101b">${label}</text>
        </g>`).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Первые три минуты сделали легкие ядра</text>
        <text x="58" y="104" class="u-subtitle">Ранняя Вселенная успела собрать простую химию, но не тяжелые элементы.</text>
        <path d="M 170 328 C 300 384, 545 384, 700 328" class="u-line gold u-dashed"></path>
        ${nodes}
        <text x="170" y="370" text-anchor="middle" class="u-label">много</text>
        <text x="510" y="370" text-anchor="middle" class="u-label">около четверти массы</text>
        <text x="700" y="370" text-anchor="middle" class="u-label">следы</text>
      `, "Big bang nucleosynthesis");
    },

    recombination() {
      return svg(`
        <text x="58" y="70" class="u-title">Когда атомы стали нейтральными, свет освободился</text>
        <text x="58" y="104" class="u-subtitle">До этого фотон все время сталкивался со свободными электронами.</text>
        <g transform="translate(110 164)">
          <circle cx="95" cy="90" r="48" fill="rgba(118,199,255,0.2)" stroke="#76c7ff" stroke-width="3"></circle>
          <circle cx="72" cy="78" r="12" fill="#76c7ff"></circle>
          <circle cx="115" cy="104" r="12" fill="#ff8f9f"></circle>
          <path d="M 165 90 C 220 35, 290 145, 345 90" class="u-line gold u-draw"></path>
          <text x="20" y="182" class="u-label">плазма непрозрачна</text>
        </g>
        <g transform="translate(530 164)">
          <circle cx="95" cy="90" r="46" fill="rgba(255,207,112,0.16)" stroke="#ffcf70" stroke-width="3"></circle>
          <circle cx="95" cy="90" r="14" fill="#76c7ff"></circle>
          <ellipse cx="95" cy="90" rx="68" ry="31" fill="none" stroke="rgba(244,247,251,0.5)" stroke-width="2" class="u-spin"></ellipse>
          <path d="M 170 88 L 300 88" class="u-line blue u-flow" marker-end="url(#u-arrow)"></path>
          <text x="6" y="182" class="u-label">атомы прозрачны для света</text>
        </g>
      `, "Recombination and first light");
    },

    cmb() {
      const rand = hash(380000);
      let speckles = "";
      for (let i = 0; i < 430; i += 1) {
        const theta = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand());
        const x = 470 + Math.cos(theta) * rr * 350;
        const y = 250 + Math.sin(theta) * rr * 155;
        const color = rand() > 0.5 ? "#ffcf70" : "#76c7ff";
        speckles += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1 + 3.4 * rand()).toFixed(1)}" fill="${color}" opacity="${(0.42 + 0.48 * rand()).toFixed(2)}"></circle>`;
      }
      return svg(`
        <text x="58" y="70" class="u-title">Реликтовое излучение - фото детства, не рождения</text>
        <text x="58" y="104" class="u-subtitle">Пятна малы: примерно одна стотысячная от средней температуры.</text>
        <ellipse cx="470" cy="260" rx="354" ry="158" fill="rgba(244,247,251,0.08)" stroke="rgba(244,247,251,0.3)" stroke-width="2"></ellipse>
        <g class="u-fade">${speckles}</g>
        <text x="470" y="450" text-anchor="middle" class="u-label">малые неровности стали семенами галактик</text>
      `, "Cosmic microwave background fluctuations");
    },

    darkMatter() {
      const rand = hash(500);
      const halos = Array.from({ length: 10 }, (_, i) => {
        const x = 115 + rand() * 710;
        const y = 140 + rand() * 250;
        const r = 34 + rand() * 58;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(118,199,255,0.07)" stroke="rgba(118,199,255,0.28)" stroke-width="2" class="u-pulse" style="animation-delay:${-i * 0.5}s"></circle>`;
      }).join("");
      const gas = stars(501, 90, { xmin: 90, xmax: 850, ymin: 120, ymax: 410, radius: 1.6, color: "#ffcf70" });
      return svg(`
        <text x="58" y="70" class="u-title">Темная материя - гравитационные строительные леса</text>
        <text x="58" y="104" class="u-subtitle">Газ падает в невидимые ямы гравитации и там начинает собираться в звезды.</text>
        ${halos}
        ${gas}
        <path d="M 150 382 C 250 280, 380 322, 470 232 C 610 92, 730 188, 812 132" class="u-line blue u-flow"></path>
        <text x="610" y="430" class="u-label">видим по гравитации, но не знаем частицу</text>
      `, "Dark matter scaffolding");
    },

    web() {
      const pts = [
        [96, 190], [170, 145], [250, 222], [330, 160], [410, 242], [500, 140],
        [590, 220], [710, 168], [820, 248], [145, 330], [285, 350], [455, 330],
        [640, 360], [780, 335]
      ];
      const lines = pts.map((p, i) => pts.slice(i + 1).map((q) => {
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        return d < 190 ? `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" class="u-line blue u-flow" opacity="${(0.18 + (190 - d) / 260).toFixed(2)}"></line>` : "";
      }).join("")).join("");
      const nodes = pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${10 + (i % 4) * 4}" fill="#f4f7fb" opacity="0.86" filter="url(#u-glow)" class="u-pulse" style="animation-delay:${-i * 0.22}s"></circle>`).join("");
      return svg(`
        <text x="58" y="70" class="u-title">На больших масштабах Вселенная похожа на сеть</text>
        <text x="58" y="104" class="u-subtitle">Нити, узлы и пустоты выросли из ранних малых неоднородностей.</text>
        ${lines}
        ${nodes}
        <text x="84" y="430" class="u-label">нити</text>
        <text x="418" y="430" class="u-label">узлы</text>
        <text x="704" y="430" class="u-label">пустоты</text>
      `, "Cosmic web");
    },

    stars() {
      return svg(`
        <text x="58" y="70" class="u-title">Звезды доделали сложную химию</text>
        <text x="58" y="104" class="u-subtitle">Ранняя Вселенная дала водород и гелий. Углерод, кислород и железо пришли позже.</text>
        <circle cx="275" cy="260" r="74" fill="url(#u-hot)" filter="url(#u-glow)" class="u-pulse"></circle>
        <path d="M 375 260 C 448 188, 545 198, 610 252" class="u-line gold u-flow" marker-end="url(#u-arrow)"></path>
        <g transform="translate(660 258)" class="u-grow">
          <circle cx="0" cy="0" r="38" fill="#ffcf70" opacity="0.9"></circle>
          <circle cx="42" cy="-26" r="18" fill="#76c7ff"></circle>
          <circle cx="-34" cy="28" r="17" fill="#8fe3a2"></circle>
          <circle cx="28" cy="38" r="13" fill="#ff8f9f"></circle>
          <circle cx="-18" cy="-36" r="12" fill="#c3a5ff"></circle>
        </g>
        <text x="204" y="390" class="u-label">звезда</text>
        <text x="590" y="390" class="u-label">тяжелые элементы</text>
      `, "Stellar nucleosynthesis");
    },

    solarSystem() {
      const orbits = [56, 86, 122, 162, 212].map((r) => `<ellipse cx="470" cy="255" rx="${r * 1.55}" ry="${r * 0.55}" fill="none" stroke="rgba(244,247,251,0.18)" stroke-width="2"></ellipse>`).join("");
      const planets = [
        [550, 238, 7, "#c5cfdd"],
        [604, 280, 10, "#ffcf70"],
        [680, 210, 11, "#76c7ff"],
        [740, 308, 9, "#ff8f70"]
      ].map(([x, y, r, c], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" class="u-drift" style="animation-delay:${-i}s"></circle>`).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Солнечная система - поздняя глава</text>
        <text x="58" y="104" class="u-subtitle">Диск газа и пыли стал Солнцем, планетами, астероидами и кометами.</text>
        ${orbits}
        <circle cx="470" cy="255" r="40" fill="url(#u-hot)" filter="url(#u-glow)" class="u-pulse"></circle>
        ${planets}
        <path d="M 245 255 C 356 186, 584 186, 700 255 C 590 324, 360 324, 245 255 Z" fill="rgba(255,207,112,0.08)" stroke="rgba(255,207,112,0.34)" stroke-width="2" class="u-spin"></path>
        <text x="470" y="430" text-anchor="middle" class="u-label">материал планет уже был обогащен предыдущими звездами</text>
      `, "Solar system formation");
    },

    darkEnergy() {
      const galaxies = [[190, 190], [310, 292], [472, 205], [620, 305], [760, 170]];
      const arrows = galaxies.map(([x, y]) => {
        const dx = (x - 470) * 0.24;
        const dy = (y - 250) * 0.24;
        return `<line x1="${x}" y1="${y}" x2="${x + dx}" y2="${y + dy}" class="u-line violet u-flow" marker-end="url(#u-arrow)"></line>`;
      }).join("");
      const gs = galaxies.map(([x, y], i) => `<g transform="translate(${x} ${y})" class="u-spin" style="animation-duration:${16 + i * 3}s"><ellipse cx="0" cy="0" rx="34" ry="12" fill="rgba(244,247,251,0.72)"></ellipse><circle cx="0" cy="0" r="8" fill="#ffcf70"></circle></g>`).join("");
      return svg(`
        <text x="58" y="70" class="u-title">Позднее расширение ускоряется</text>
        <text x="58" y="104" class="u-subtitle">На малых масштабах гравитация связывает системы. Между скоплениями расстояния растут все быстрее.</text>
        <circle cx="470" cy="250" r="245" fill="none" stroke="rgba(195,165,255,0.14)" stroke-width="3" class="u-grow"></circle>
        ${arrows}
        ${gs}
        <text x="470" y="430" text-anchor="middle" class="u-label">темная энергия - имя для измеренного эффекта, а не готовое объяснение</text>
      `, "Accelerated expansion");
    },

    future() {
      const left = stars(900, 95, { xmin: 80, xmax: 380, ymin: 140, ymax: 390, radius: 1.4 });
      const right = stars(901, 20, { xmin: 570, xmax: 840, ymin: 150, ymax: 380, radius: 1.2 });
      return svg(`
        <text x="58" y="70" class="u-title">Далекое будущее зависит от неизвестной физики</text>
        <text x="58" y="104" class="u-subtitle">В простейшем сценарии Вселенная становится холоднее, темнее и беднее событиями.</text>
        <rect x="74" y="136" width="350" height="275" rx="14" class="u-panel"></rect>
        <rect x="516" y="136" width="350" height="275" rx="14" class="u-panel"></rect>
        ${left}
        ${right}
        <text x="249" y="450" text-anchor="middle" class="u-label">сейчас: много видимого прошлого</text>
        <text x="691" y="450" text-anchor="middle" class="u-label">позже: горизонт беднеет</text>
      `, "Long-term cosmic future");
    },

    evidence() {
      const cards = [
        [98, 142, "расширение", "красные смещения", "#76c7ff"],
        [512, 142, "первый свет", "реликтовое излучение", "#ffcf70"],
        [98, 296, "первые минуты", "водород, гелий, дейтерий", "#8fe3a2"],
        [512, 296, "рост структуры", "галактики и линзирование", "#c3a5ff"]
      ];
      const cardMarkup = cards.map(([x, y, a, b, c], i) => `
        <g class="u-pulse" style="animation-delay:${-i * 0.35}s">
          <rect x="${x}" y="${y}" width="330" height="96" rx="12" fill="rgba(244,247,251,0.055)" stroke="${c}" stroke-width="2"></rect>
          <circle cx="${x + 42}" cy="${y + 48}" r="20" fill="${c}" opacity="0.86"></circle>
          <text x="${x + 82}" y="${y + 40}" class="u-label">${a}</text>
          <text x="${x + 82}" y="${y + 70}" class="u-small">${b}</text>
        </g>`).join("");
      return svg(`
        <text x="58" y="70" class="u-title">История убедительна, потому что следы сходятся</text>
        <text x="58" y="104" class="u-subtitle">Космология держится не на одной картинке, а на перекрестной проверке.</text>
        ${cardMarkup}
        <path d="M 428 190 L 512 190 M 428 344 L 512 344 M 264 238 L 264 296 M 678 238 L 678 296" class="u-line u-dashed" opacity="0.46"></path>
      `, "Evidence for cosmic history");
    }
  };

  function renderAll() {
    document.querySelectorAll("[data-universe-viz]").forEach((node) => {
      const type = node.getAttribute("data-universe-viz");
      if (viz[type]) {
        node.innerHTML = viz[type]();
      }
    });
  }

  function setupSphereSurfaceAnimations() {
    document.querySelectorAll("[data-sphere-surface]").forEach((surface) => {
      if (surface.__sphereSurfaceReady) {
        return;
      }
      surface.__sphereSurfaceReady = true;

      const radius = Number(surface.getAttribute("data-radius")) || 186;
      const gridLayer = surface.querySelector("[data-sphere-grid]");
      const galaxiesLayer = surface.querySelector("[data-sphere-galaxies]");
      const observersLayer = surface.querySelector("[data-sphere-observers]");
      const palette = ["#76c7ff", "#c3a5ff", "#ff8f9f", "#ffcf70", "#8fe3a2", "#7dd3fc"];

      const normalize = (v) => {
        const length = Math.hypot(v.x, v.y, v.z) || 1;
        return { x: v.x / length, y: v.y / length, z: v.z / length };
      };

      const fibonacciSphere = (count) => {
        const points = [];
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < count; i += 1) {
          const z = 1 - 2 * ((i + 0.5) / count);
          const r = Math.sqrt(Math.max(0, 1 - z * z));
          const theta = golden * i;
          points.push(normalize({
            x: Math.cos(theta) * r,
            y: Math.sin(theta) * r,
            z
          }));
        }
        return points;
      };

      const rotateAndProject = (dir, angle, currentRadius) => {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const depth = dir.x * c - dir.y * s;
        const horizontal = dir.x * s + dir.y * c;
        return {
          x: horizontal * currentRadius,
          y: -dir.z * currentRadius,
          depth
        };
      };

      const pathFor = (dirs, angle, currentRadius) => dirs.map((dir, i) => {
        const p = rotateAndProject(dir, angle, currentRadius);
        return `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      }).join(" ");

      const circleDirs = (pointForAngle, steps = 96) => {
        const dirs = [];
        for (let i = 0; i <= steps; i += 1) {
          dirs.push(pointForAngle(i / steps * Math.PI * 2));
        }
        return dirs;
      };

      const latitudes = [-60, -35, 0, 35, 60].map((deg) => {
        const lat = deg * Math.PI / 180;
        const z = Math.sin(lat);
        const r = Math.cos(lat);
        return circleDirs((angle) => ({ x: r * Math.cos(angle), y: r * Math.sin(angle), z }));
      });

      const meridians = [0, 30, 60, 90, 120, 150].map((deg) => {
        const lon = deg * Math.PI / 180;
        return circleDirs((angle) => ({
          x: Math.cos(angle) * Math.cos(lon),
          y: Math.cos(angle) * Math.sin(lon),
          z: Math.sin(angle)
        }));
      });

      const galaxies = fibonacciSphere(58).map((dir, i) => ({
        dir,
        color: palette[i % palette.length],
        size: 3.5 + (i % 5) * 0.55
      }));

      const observers = [
        ["Мы", 0, "#ffcf70"],
        ["Они", -Math.PI / 2, "#8fe3a2"],
        ["Они", -Math.PI, "#c3a5ff"],
        ["Они", -3 * Math.PI / 2, "#ff8f9f"]
      ].map(([label, angle, color]) => ({
        label,
        color,
        dir: { x: Math.cos(angle), y: Math.sin(angle), z: 0 }
      }));

      const easedQuarterAngle = (elapsed) => {
        const segment = 3600;
        const hold = 1050;
        const local = elapsed % segment;
        const turn = Math.floor(elapsed / segment);
        if (local < hold) {
          return turn * Math.PI / 2;
        }
        const t = Math.min(1, (local - hold) / (segment - hold));
        const smooth = t * t * (3 - 2 * t);
        return (turn + smooth) * Math.PI / 2;
      };

      const draw = (elapsed) => {
        const angle = easedQuarterAngle(elapsed);
        const currentRadius = radius * (1 + 0.025 * Math.sin(elapsed / 1350));

        gridLayer.innerHTML = `
          ${latitudes.map((dirs) => `<path d="${pathFor(dirs, angle, currentRadius)}" fill="none" stroke="rgba(244,247,251,0.13)" stroke-width="1.5"></path>`).join("")}
          ${meridians.map((dirs) => `<path d="${pathFor(dirs, angle, currentRadius)}" fill="none" stroke="rgba(244,247,251,0.16)" stroke-width="1.5"></path>`).join("")}
        `;

        galaxiesLayer.innerHTML = galaxies
          .map((galaxy) => {
            const p = rotateAndProject(galaxy.dir, angle, currentRadius * 1.01);
            return { ...galaxy, ...p };
          })
          .sort((a, b) => a.depth - b.depth)
          .map((galaxy) => {
            const front = (galaxy.depth + 1) / 2;
            const opacity = 0.18 + 0.72 * front;
            const r = galaxy.size + 4.2 * front;
            return `<circle cx="${galaxy.x.toFixed(1)}" cy="${galaxy.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${galaxy.color}" opacity="${opacity.toFixed(2)}" stroke="rgba(244,247,251,${(0.18 + front * 0.42).toFixed(2)})" stroke-width="1.1"></circle>`;
          })
          .join("");

        observersLayer.innerHTML = observers
          .map((observer) => {
            const p = rotateAndProject(observer.dir, angle, currentRadius * 1.035);
            return { ...observer, ...p };
          })
          .filter((observer) => observer.depth > -0.12)
          .sort((a, b) => a.depth - b.depth)
          .map((observer) => {
            const front = Math.max(0, observer.depth);
            const r = 11 + 7 * front;
            const opacity = 0.45 + 0.55 * front;
            return `
              <g opacity="${opacity.toFixed(2)}">
                <circle cx="${observer.x.toFixed(1)}" cy="${observer.y.toFixed(1)}" r="${(r + 9).toFixed(1)}" fill="${observer.color}" opacity="0.18"></circle>
                <circle cx="${observer.x.toFixed(1)}" cy="${observer.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${observer.color}" stroke="rgba(244,247,251,0.86)" stroke-width="2.4"></circle>
                <text x="${observer.x.toFixed(1)}" y="${(observer.y - r - 12).toFixed(1)}" text-anchor="middle" class="u-title" style="font-size:${(22 + 7 * front).toFixed(1)}px;fill:${observer.color}">${observer.label}</text>
              </g>
            `;
          })
          .join("");
      };

      let elapsed = 0;
      let lastVisibleNow = null;
      draw(0);

      const animate = (now) => {
        if (!document.documentElement.contains(surface)) {
          return;
        }
        const section = surface.closest("section");
        if (section && !section.classList.contains("present")) {
          lastVisibleNow = null;
          window.requestAnimationFrame(animate);
          return;
        }
        if (lastVisibleNow === null) {
          lastVisibleNow = now;
        }
        elapsed += now - lastVisibleNow;
        lastVisibleNow = now;
        draw(elapsed);
        window.requestAnimationFrame(animate);
      };

      window.requestAnimationFrame(animate);
    });
  }

  function slideVideoStart(video) {
    const start = Number.parseFloat(video.dataset.videoStart || "0");
    return Number.isFinite(start) && start > 0 ? start : 0;
  }

  function seekSlideVideoStart(video) {
    const start = slideVideoStart(video);
    try {
      if (Math.abs(video.currentTime - start) > 0.2) {
        video.currentTime = start;
      }
    } catch (error) {
      // Some browsers disallow seeking before metadata is ready.
    }
  }

  function syncSlideVideos() {
    document.querySelectorAll("video[data-slide-video]").forEach((video) => {
      const isCurrent = Boolean(video.closest("section.present"));
      const start = slideVideoStart(video);
      if (isCurrent) {
        if (video.currentTime < start - 0.15) {
          seekSlideVideoStart(video);
        }
        video.play().catch(() => {});
      } else {
        video.pause();
        seekSlideVideoStart(video);
      }
    });
  }

  function setupSlideVideoPlayback() {
    if (slideVideoPlaybackReady) {
      syncSlideVideos();
      return;
    }
    slideVideoPlaybackReady = true;

    if (window.Reveal && typeof window.Reveal.on === "function") {
      window.Reveal.on("ready", syncSlideVideos);
      window.Reveal.on("slidechanged", syncSlideVideos);
    } else if (window.Reveal && typeof window.Reveal.addEventListener === "function") {
      window.Reveal.addEventListener("ready", syncSlideVideos);
      window.Reveal.addEventListener("slidechanged", syncSlideVideos);
    }

    window.addEventListener("hashchange", syncSlideVideos);
    setTimeout(syncSlideVideos, 250);
    setTimeout(syncSlideVideos, 900);
  }

  function boot() {
    renderAll();
    setupSphereSurfaceAnimations();
    setupSlideVideoPlayback();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("load", boot, { once: true });
})();
