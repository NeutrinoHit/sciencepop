/*
 * Drawings shared by the «Простыми словами» lectures.
 *
 *   <div data-periodic-table></div>          periodic table, 118 elements
 *   <div data-planetary-atom="2,8,5"></div>  "planetary" picture of an atom
 *   <div data-nucleus="p,n,p,..."></div>     nucleus as a cluster of nucleons
 *
 * Everything is drawn here, so the lectures carry no third-party images.
 */
(function () {
  const SVG = "http://www.w3.org/2000/svg";

  const SYMBOLS = (
    "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn " +
    "Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba " +
    "La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi " +
    "Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds " +
    "Rg Cn Nh Fl Mc Lv Ts Og"
  ).split(" ");

  const GROUPS = {
    alkali: [3, 11, 19, 37, 55, 87],
    alkaline: [4, 12, 20, 38, 56, 88],
    nonmetal: [1, 6, 7, 8, 15, 16, 34],
    halogen: [9, 17, 35, 53, 85, 117],
    noble: [2, 10, 18, 36, 54, 86, 118],
    metalloid: [5, 14, 32, 33, 51, 52],
    post: [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116]
  };

  function category(z) {
    for (const [name, list] of Object.entries(GROUPS)) {
      if (list.includes(z)) return name;
    }
    if (z >= 57 && z <= 71) return "lanthanide";
    if (z >= 89 && z <= 103) return "actinide";
    return "transition";
  }

  // Row and column of element z in the 18-column table; f-block in rows 9-10.
  function position(z) {
    if (z === 1) return [1, 1];
    if (z === 2) return [1, 18];
    const blocks = [[3, 10, 2], [11, 18, 3]];
    for (const [first, last, row] of blocks) {
      if (z >= first && z <= last) {
        const k = z - first;
        return [row, k < 2 ? k + 1 : k + 11];
      }
    }
    if (z <= 36) return [4, z - 18];
    if (z <= 54) return [5, z - 36];
    const longRow = (start, row) => {
      const k = z - start;
      if (k < 2) return [row, k + 1];
      if (k < 17) return [row + 3, k + 1];
      return [row, k - 13];
    };
    if (z <= 86) return longRow(55, 6);
    return longRow(87, 7);
  }

  function periodicTable(host) {
    host.classList.add("pt");
    for (let z = 1; z <= SYMBOLS.length; z++) {
      const [row, col] = position(z);
      const cell = document.createElement("div");
      cell.className = `pt-cell pt-${category(z)}`;
      cell.style.gridRow = String(row);
      cell.style.gridColumn = String(col);
      cell.innerHTML = `<span class="pt-z">${z}</span><span class="pt-s">${SYMBOLS[z - 1]}</span>`;
      host.appendChild(cell);
    }
    [["57–71", 6, "lanthanide"], ["89–103", 7, "actinide"]].forEach(([label, row, kind]) => {
      const cell = document.createElement("div");
      cell.className = `pt-cell pt-${kind} pt-ref`;
      cell.style.gridRow = String(row);
      cell.style.gridColumn = "3";
      cell.textContent = label;
      host.appendChild(cell);
    });
  }

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  }

  // One shared set of gradients: ids inside hidden slides would not paint.
  function gradients() {
    if (document.getElementById("nut-gradients")) return;
    const svg = el("svg", { id: "nut-gradients", width: 0, height: 0, "aria-hidden": "true",
      style: "position:absolute;width:0;height:0;overflow:hidden" }, document.body);
    const defs = el("defs", {}, svg);
    [["nut-p", "#ff8a95", "#d8344a", "#7a1020"], ["nut-n", "#8fb0ff", "#3d63cc", "#14286b"]]
      .forEach(([id, light, mid, dark]) => {
        const g = el("radialGradient", { id, cx: "35%", cy: "30%", r: "70%" }, defs);
        el("stop", { offset: "0%", "stop-color": light }, g);
        el("stop", { offset: "55%", "stop-color": mid }, g);
        el("stop", { offset: "100%", "stop-color": dark }, g);
      });
  }

  // Nucleons on a compact hexagonal spiral around the centre.
  function nucleonPositions(count) {
    const points = [[0, 0]];
    for (let ring = 1; points.length < count; ring++) {
      const n = 6 * ring;
      for (let i = 0; i < n && points.length < count; i++) {
        const angle = (2 * Math.PI * i) / n + ring * 0.4;
        points.push([ring * Math.cos(angle), ring * Math.sin(angle)]);
      }
    }
    return points;
  }

  function nucleus(host) {
    const kinds = host.dataset.nucleus.split(",").map((s) => s.trim());
    const svg = el("svg", { viewBox: "-100 -100 200 200", class: "nut-nucleus-svg", role: "img" }, host);
    const r = kinds.length === 1 ? 62 : kinds.length <= 3 ? 50 : 26;
    const step = kinds.length <= 3 ? r * 1.2 : r * 1.25;
    const points = kinds.length === 2 ? [[-0.5, 0.15], [0.5, -0.15]]
      : kinds.length === 3 ? [[-0.55, 0.3], [0.55, 0.3], [0, -0.5]]
      : nucleonPositions(kinds.length);
    points
      .map((p, i) => ({ x: p[0] * step, y: p[1] * step, kind: kinds[i] }))
      .sort((a, b) => a.y - b.y)
      .forEach(({ x, y, kind }) => {
        el("circle", { cx: x, cy: y, r, fill: `url(#nut-${kind === "p" ? "p" : "n"})` }, svg);
      });
  }

  function planetaryAtom(host) {
    const shells = host.dataset.planetaryAtom.split(",").map(Number);
    const svg = el("svg", { viewBox: "-200 -200 400 400", class: "nut-atom-svg", role: "img" }, host);
    shells.forEach((count, s) => {
      const radius = 70 + 55 * s;
      el("circle", { cx: 0, cy: 0, r: radius, class: "nut-orbit" }, svg);
      const group = el("g", { class: "nut-shell", style: `animation-duration:${8 + 5 * s}s` }, svg);
      for (let i = 0; i < count; i++) {
        const a = (2 * Math.PI * i) / count;
        el("circle", { cx: radius * Math.cos(a), cy: radius * Math.sin(a), r: 9, class: "nut-electron" }, group);
      }
    });
    const core = nucleonPositions(13);
    core.forEach(([x, y], i) => {
      el("circle", { cx: x * 12, cy: y * 12, r: 10, fill: `url(#nut-${i % 2 ? "n" : "p"})` }, svg);
    });
  }

  function init() {
    gradients();
    document.querySelectorAll("[data-periodic-table]").forEach(periodicTable);
    document.querySelectorAll("[data-nucleus]").forEach(nucleus);
    document.querySelectorAll("[data-planetary-atom]").forEach(planetaryAtom);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
