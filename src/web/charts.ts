/**
 * Small SVG chart helpers.
 *
 * Every chart is drawn from the same engine output the numbers come from, on
 * one scale per chart, with labels that name values the chart actually reaches.
 * Colours come from CSS custom properties so both themes work without a redraw.
 */

const NS = "http://www.w3.org/2000/svg";

export const el = (name: string, attrs: Record<string, string | number> = {}, text?: string) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};

export const svg = (viewBox: string, className = "chart") => {
  const node = el("svg", { viewBox, class: className, preserveAspectRatio: "xMidYMid meet" });
  node.setAttribute("role", "img");
  return node as SVGSVGElement;
};

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export const compactAed = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  if (abs >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
};

const niceMax = (value: number): number => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
};

/** Twelve months of generation against consumption. */
export const monthlyChart = (generation: number[], load: number[], unit = "MWh"): SVGSVGElement => {
  const width = 680;
  const height = 240;
  const pad = { top: 18, right: 12, bottom: 30, left: 52 };
  const node = svg(`0 0 ${width} ${height}`);
  node.setAttribute("aria-label", "Monthly generation against consumption");

  const max = niceMax(Math.max(...load, ...generation));
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (index + 0.5) * (plotW / 12);
  const y = (value: number) => pad.top + plotH - (value / max) * plotH;

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = (max / 4) * tick;
    node.append(
      el("line", {
        x1: pad.left,
        x2: width - pad.right,
        y1: y(value),
        y2: y(value),
        class: "grid",
      }),
      el("text", { x: pad.left - 8, y: y(value) + 4, class: "tick", "text-anchor": "end" },
        tick === 4 ? `${Math.round(value)} ${unit}` : String(Math.round(value))),
    );
  }

  const bandW = plotW / 12;
  const barW = Math.min(18, bandW * 0.42);

  generation.forEach((value, index) => {
    // Consumption sits behind as a quiet column; generation in front in solar amber.
    node.append(
      el("rect", {
        x: x(index) - barW - 1,
        y: y(load[index]),
        width: barW,
        height: Math.max(0, plotH - (y(load[index]) - pad.top)),
        class: "bar-load",
        rx: 1.5,
      }),
      el("rect", {
        x: x(index) + 1,
        y: y(value),
        width: barW,
        height: Math.max(0, plotH - (y(value) - pad.top)),
        class: "bar-gen",
        rx: 1.5,
      }),
      el("text", { x: x(index), y: height - 10, class: "tick", "text-anchor": "middle" }, MONTHS[index]),
    );
  });

  return node;
};

/** One representative day, hour by hour. */
export const dayChart = (
  generation: number[],
  load: number[],
  battery: number[] | null,
  label: string,
): SVGSVGElement => {
  const width = 680;
  const height = 240;
  const pad = { top: 18, right: 12, bottom: 30, left: 52 };
  const node = svg(`0 0 ${width} ${height}`);
  node.setAttribute("aria-label", `Hourly profile for ${label}`);

  const max = niceMax(Math.max(...generation, ...load) * 1.05);
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = (hour: number) => pad.left + (hour / 23) * plotW;
  const y = (value: number) => pad.top + plotH - (value / max) * plotH;

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = (max / 4) * tick;
    node.append(
      el("line", { x1: pad.left, x2: width - pad.right, y1: y(value), y2: y(value), class: "grid" }),
      el("text", { x: pad.left - 8, y: y(value) + 4, class: "tick", "text-anchor": "end" },
        tick === 4 ? `${Math.round(value)} kW` : String(Math.round(value))),
    );
  }

  const area = [
    `M ${x(0)} ${y(0)}`,
    ...generation.map((value, hour) => `L ${x(hour)} ${y(value)}`),
    `L ${x(23)} ${y(0)} Z`,
  ].join(" ");
  node.append(el("path", { d: area, class: "area-gen" }));

  const line = load.map((value, hour) => `${hour === 0 ? "M" : "L"} ${x(hour)} ${y(value)}`).join(" ");
  node.append(el("path", { d: line, class: "line-load" }));

  if (battery) {
    const socMax = niceMax(Math.max(...battery, 1));
    const socLine = battery
      .map((value, hour) => `${hour === 0 ? "M" : "L"} ${x(hour)} ${pad.top + plotH - (value / socMax) * plotH * 0.35}`)
      .join(" ");
    node.append(el("path", { d: socLine, class: "line-battery" }));
  }

  for (const hour of [0, 6, 12, 18, 23]) {
    node.append(
      el("text", { x: x(hour), y: height - 10, class: "tick", "text-anchor": "middle" },
        `${String(hour).padStart(2, "0")}:00`),
    );
  }

  return node;
};

/** Cumulative cashflow with the payback crossing marked. */
export const cashflowChart = (
  cumulative: number[],
  paybackYears: number | null,
  band?: { p10: number[]; p90: number[] },
): SVGSVGElement => {
  const width = 680;
  const height = 240;
  const pad = { top: 18, right: 16, bottom: 30, left: 60 };
  const node = svg(`0 0 ${width} ${height}`);
  node.setAttribute("aria-label", "Cumulative cash position over 25 years");

  const values = band ? [...cumulative, ...band.p10, ...band.p90] : cumulative;
  const max = niceMax(Math.max(...values, 0));
  const min = -niceMax(Math.abs(Math.min(...values, 0)));
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = (year: number) => pad.left + (year / (cumulative.length - 1)) * plotW;
  const y = (value: number) => pad.top + plotH - ((value - min) / (max - min)) * plotH;

  for (const value of [min, (min + max) / 2, max]) {
    node.append(
      el("line", { x1: pad.left, x2: width - pad.right, y1: y(value), y2: y(value), class: "grid" }),
      el("text", { x: pad.left - 8, y: y(value) + 4, class: "tick", "text-anchor": "end" },
        `${value < 0 ? "-" : ""}AED ${compactAed(Math.abs(value))}`),
    );
  }
  node.append(el("line", { x1: pad.left, x2: width - pad.right, y1: y(0), y2: y(0), class: "zero" }));

  if (band) {
    const top = band.p90.map((value, year) => `${year === 0 ? "M" : "L"} ${x(year)} ${y(value)}`).join(" ");
    const bottom = [...band.p10]
      .map((value, year) => ({ value, year }))
      .reverse()
      .map((point) => `L ${x(point.year)} ${y(point.value)}`)
      .join(" ");
    node.append(el("path", { d: `${top} ${bottom} Z`, class: "band" }));
  }

  const line = cumulative.map((value, year) => `${year === 0 ? "M" : "L"} ${x(year)} ${y(value)}`).join(" ");
  node.append(el("path", { d: line, class: "line-cash" }));

  if (paybackYears !== null && paybackYears <= cumulative.length - 1) {
    node.append(
      el("line", { x1: x(paybackYears), x2: x(paybackYears), y1: pad.top, y2: pad.top + plotH, class: "marker" }),
      el("circle", { cx: x(paybackYears), cy: y(0), r: 4, class: "marker-dot" }),
      el("text", {
        x: Math.min(x(paybackYears) + 8, width - pad.right - 90),
        y: pad.top + 14,
        class: "marker-label",
      }, `pays back ${paybackYears.toFixed(1)} yrs`),
    );
  }

  for (const year of [0, 5, 10, 15, 20, 25]) {
    if (year >= cumulative.length) continue;
    node.append(
      el("text", { x: x(year), y: height - 10, class: "tick", "text-anchor": "middle" },
        year === 0 ? "today" : `yr ${year}`),
    );
  }

  return node;
};

/** Tornado: which assumption moves the answer most. */
export const tornadoChart = (
  entries: { label: string; lowNpvAed: number; highNpvAed: number; baseNpvAed: number }[],
): SVGSVGElement => {
  const rowH = 30;
  const width = 680;
  const height = entries.length * rowH + 34;
  const pad = { top: 8, right: 86, bottom: 26, left: 150 };
  const node = svg(`0 0 ${width} ${height}`);
  node.setAttribute("aria-label", "Which assumption moves the result most");

  const base = entries[0]?.baseNpvAed ?? 0;
  const spread = Math.max(
    ...entries.map((entry) => Math.max(Math.abs(entry.lowNpvAed - base), Math.abs(entry.highNpvAed - base))),
    1,
  );
  const plotW = width - pad.left - pad.right;
  const centre = pad.left + plotW / 2;
  const x = (value: number) => centre + ((value - base) / spread) * (plotW / 2);

  entries.forEach((entry, index) => {
    const y = pad.top + index * rowH;
    const left = Math.min(x(entry.lowNpvAed), x(entry.highNpvAed));
    const right = Math.max(x(entry.lowNpvAed), x(entry.highNpvAed));
    node.append(
      el("text", { x: pad.left - 10, y: y + rowH / 2 + 4, class: "tick", "text-anchor": "end" }, entry.label),
      el("rect", { x: left, y: y + 6, width: Math.max(2, right - left), height: rowH - 16, class: "tornado-bar", rx: 2 }),
      el("text", { x: Math.min(right + 6, width - pad.right + 60), y: y + rowH / 2 + 4, class: "tick" },
        `${entry.highNpvAed >= entry.lowNpvAed ? "+" : "-"}AED ${compactAed(Math.abs(entry.highNpvAed - entry.lowNpvAed))}`),
    );
  });

  node.append(
    el("line", { x1: centre, x2: centre, y1: pad.top, y2: pad.top + entries.length * rowH, class: "zero" }),
    el("text", { x: centre, y: height - 8, class: "tick", "text-anchor": "middle" }, "base case"),
  );
  return node;
};

/** The site plan: roof outline with the panel rows that actually fit. */
export const sitePlan = (input: {
  roofWidthM: number;
  roofDepthM: number;
  rows: { x: number; y: number; w: number; h: number }[];
  layout: string;
  moduleCount: number;
}): SVGSVGElement => {
  const pad = 34;
  const scale = Math.min(620 / input.roofWidthM, 300 / input.roofDepthM);
  const w = input.roofWidthM * scale;
  const h = input.roofDepthM * scale;
  const width = w + pad * 2;
  const height = h + pad * 2 + 16;
  const node = svg(`0 0 ${width} ${height}`, "plan");
  node.setAttribute("aria-label", `Roof plan with ${input.moduleCount} panels in ${input.layout} rows`);

  node.append(el("rect", { x: pad, y: pad, width: w, height: h, class: "roof", rx: 2 }));

  for (const row of input.rows) {
    node.append(
      el("rect", {
        x: pad + row.x * scale,
        y: pad + row.y * scale,
        width: Math.max(1, row.w * scale),
        height: Math.max(1.5, row.h * scale),
        class: "panel-row",
      }),
    );
  }

  // North arrow: rows face south, so which way is north matters to the reader.
  node.append(
    el("line", { x1: width - 18, y1: pad + 22, x2: width - 18, y2: pad + 2, class: "north" }),
    el("path", { d: `M ${width - 22} ${pad + 7} L ${width - 18} ${pad - 1} L ${width - 14} ${pad + 7} Z`, class: "north-head" }),
    el("text", { x: width - 18, y: pad + 34, class: "tick", "text-anchor": "middle" }, "N"),
  );

  // Scale bar, in metres, because a plan without one is a picture.
  const barM = input.roofWidthM > 120 ? 50 : 20;
  const barPx = barM * scale;
  node.append(
    el("line", { x1: pad, y1: height - 14, x2: pad + barPx, y2: height - 14, class: "scalebar" }),
    el("line", { x1: pad, y1: height - 18, x2: pad, y2: height - 10, class: "scalebar" }),
    el("line", { x1: pad + barPx, y1: height - 18, x2: pad + barPx, y2: height - 10, class: "scalebar" }),
    el("text", { x: pad + barPx + 8, y: height - 10, class: "tick" }, `${barM} m`),
  );

  return node;
};
