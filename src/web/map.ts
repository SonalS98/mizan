/**
 * The map.
 *
 * Real OpenStreetMap geometry for each study area: roads and building
 * outlines, pulled from Overpass and baked into the page so it works with the
 * network off. Click a building and it becomes the site; the panel rows drawn
 * on it are the rows the packer actually fitted inside that outline.
 *
 * No tile imagery. The page draws the vectors itself, which keeps it honest
 * about what it knows: these are mapped footprints, not a photograph.
 */

import {
  packRoof,
  polygonAreaM2,
  polygonBounds,
  plantPositions,
  type PanelRow,
  type PolygonM,
} from "../engine/packing";
import type { ElectricalDesign } from "../engine/electrical";
import { thinRows, type ObstructionShading, type ShadingResult } from "../engine/shading";

export type Scene = {
  id: string;
  label: string;
  area: string;
  /** Lower-left corner of the local metre frame, as lng/lat. */
  o: [number, number];
  size: [number, number];
  b: { a: number; p: string; h?: number | null; hs?: string | null }[];
  r: { c: string; p: string }[];
};

export type SceneBuilding = {
  index: number;
  polygon: PolygonM;
  areaM2: number;
  /** Height above ground in metres, where OpenStreetMap records one. */
  heightM: number | null;
  /** How that height was known: a height tag, or floors times a storey. */
  heightSource: "height" | "levels" | null;
};

export const parsePath = (path: string): PolygonM =>
  path
    .split(" ")
    .filter(Boolean)
    .map((pair) => pair.split(",").map(Number) as [number, number]);

export const sceneBuildings = (scene: Scene): SceneBuilding[] =>
  scene.b.map((item, index) => {
    const polygon = parsePath(item.p);
    return {
      index,
      polygon,
      areaM2: polygonAreaM2(polygon),
      heightM: typeof item.h === "number" ? item.h : null,
      heightSource: (item.hs as "height" | "levels" | null) ?? null,
    };
  });

const NS = "http://www.w3.org/2000/svg";
const make = (name: string, attrs: Record<string, string | number> = {}, text?: string) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Road classes, keyed by the first letter Overpass gave us. */
const ROAD_WIDTH: Record<string, number> = { m: 11, t: 9, p: 8, s: 7, u: 5, r: 4 };

export type MapView = "area" | "roof" | "wiring" | "shading";

/**
 * Heat-map colour for a module, given its share of the worst loss on the roof.
 * Clean panels stay the paper colour so the roof still reads as a roof; the
 * shaded ones warm towards the same orange the panels use elsewhere, so the
 * page does not gain a new colour language for one view.
 */
const shadeColour = (share: number): string => {
  const t = Math.max(0, Math.min(1, share));
  // Pale sand at zero through to deep orange at the worst module.
  const hue = 42 - 26 * t;
  const sat = 30 + 55 * t;
  const light = 88 - 38 * t;
  return `hsl(${hue} ${sat}% ${light}%)`;
};

/**
 * Colours for the DC strings. Neighbouring strings must be told apart at a
 * glance, so the hues step by a large, non-repeating amount rather than
 * sweeping smoothly round the wheel.
 */
const stringColour = (index: number): string => `hsl(${(index * 137.5) % 360} 62% 42%)`;

export type DrawInput = {
  scene: Scene;
  buildings: SceneBuilding[];
  selected: number | null;
  view: MapView;
  latitude: number;
  layout: "south" | "east-west";
  /** How much of the packed roof the recommended system actually uses. */
  fillShare: number;
  batteryKwh: number;
  /** The wired design, when there is one. Only drawn in the wiring view. */
  design?: ElectricalDesign | null;
  /** Per-module shading from the row in front, when it has been computed. */
  shading?: ShadingResult | null;
  /** Per-module shading from taller buildings around it. */
  blocked?: ObstructionShading | null;
  /** How high the selected roof stands, so neighbours can be drawn relative to it. */
  roofHeightM?: number | null;
  onSelect: (index: number) => void;
};

export type DrawnBox = { x: number; y: number; w: number; h: number };

/** Worst combined loss on any panel, filled in when the shading view draws. */
export type ShadingScale = { worst: number; fromNeighbours: boolean };
let lastShadingScale: ShadingScale = { worst: 0, fromNeighbours: false };
export const shadingScale = (): ShadingScale => lastShadingScale;

/**
 * The wiring view.
 *
 * Each string is drawn as it would be pulled: a leapfrog path out along the
 * row taking every other module and back along it picking up the rest, so the
 * two ends finish side by side. The dashed line is the home run from those
 * ends to the inverter, which is the cable that actually gets bought by the
 * metre. Colour only separates one string from the next; it carries no other
 * meaning.
 */
const drawWiring = (
  flip: SVGElement,
  polygon: PolygonM,
  design: ElectricalDesign,
  box: { x: number; y: number; w: number; h: number },
) => {
  const scale = box.w / 600;
  const moduleW = design.sizing.module.widthM;
  const moduleH = design.sizing.module.heightM * Math.cos((10 * Math.PI) / 180);

  // Every wired module, drawn faintly so the string path reads on top of it.
  for (const run of design.strings) {
    for (const item of run.modules) {
      flip.append(
        make("rect", {
          x: item.at[0] - moduleW / 2,
          y: item.at[1] - moduleH / 2,
          width: moduleW,
          height: moduleH,
          class: "map-panel map-panel-wired",
        }),
      );
    }
  }

  // Home runs first, so the string paths sit above them.
  for (const run of design.strings) {
    flip.append(
      make("polyline", {
        points: run.homeRunPath.map((p) => p.join(",")).join(" "),
        class: "map-homerun",
        "stroke-width": Math.max(0.35, 0.6 * scale),
      }),
    );
  }

  design.strings.forEach((run) => {
    flip.append(
      make("polyline", {
        points: run.path.map((p) => p.join(",")).join(" "),
        class: "map-string",
        stroke: stringColour(run.index),
        "stroke-width": Math.max(0.4, 0.75 * scale),
      }),
    );
    // A dot at the start marks where the pair of conductors leaves the string.
    flip.append(
      make("circle", {
        cx: run.path[0][0],
        cy: run.path[0][1],
        r: Math.max(0.5, 0.9 * scale),
        class: "map-string-head",
        fill: stringColour(run.index),
      }),
    );
  });

  design.inverterAt.forEach((at) => {
    flip.append(
      make("rect", {
        x: at[0] - 3,
        y: at[1] - 2,
        width: 6,
        height: 4,
        class: "map-plant",
      }),
    );
  });
};

/**
 * The shading heat map: one rectangle per panel, coloured by how much of the
 * year it spends in the shadow of the row in front.
 *
 * The striping is the point. Rows the packer left out for plant and walkways
 * give the row behind them a double gap, and a row with a double gap in front
 * is never shaded at all. So the clean stripes are not a drawing artefact,
 * they are rows that are getting something for free.
 */
const drawShading = (
  flip: SVGElement,
  rows: PanelRow[],
  shading: ShadingResult,
  blocked: ObstructionShading | null,
) => {
  // Both shadows fall on the same panel, so the map shows what it actually
  // loses rather than picking one cause. The scale runs to the worst panel.
  const lossAt = (rowIndex: number, m: number) => {
    const row = shading.byModule[rowIndex]?.[m] ?? 0;
    const near = blocked?.byModule[rowIndex]?.[m] ?? 0;
    return 1 - (1 - row) * (1 - near);
  };
  let worst = 1e-9;
  rows.forEach((row, rowIndex) => {
    for (let m = 0; m < row.modules; m += 1) worst = Math.max(worst, lossAt(rowIndex, m));
  });
  let worstFromNeighbours = 0;
  rows.forEach((row, rowIndex) => {
    for (let m = 0; m < row.modules; m += 1) {
      worstFromNeighbours = Math.max(worstFromNeighbours, blocked?.byModule[rowIndex]?.[m] ?? 0);
    }
  });
  lastShadingScale = { worst, fromNeighbours: worstFromNeighbours > worst * 0.5 };

  rows.forEach((row, rowIndex) => {
    const width = row.w / Math.max(1, row.modules);
    for (let m = 0; m < row.modules; m += 1) {
      flip.append(
        make("rect", {
          x: row.x + m * width,
          y: row.y,
          width,
          height: row.h,
          class: "map-shade-cell",
          fill: shadeColour(lossAt(rowIndex, m) / worst),
        }),
      );
    }
  });
};

export const drawMap = (host: HTMLElement, input: DrawInput): DrawnBox => {
  const { scene, buildings, selected } = input;
  const [width, height] = scene.size;
  host.innerHTML = "";

  const selectedBuilding = selected !== null ? buildings[selected] : null;

  // The downloaded square usually has empty desert around the estate, so the
  // area view frames the buildings themselves.
  let box = { x: 0, y: 0, w: width, h: height };
  if (buildings.length > 0) {
    const xs = buildings.flatMap((item) => item.polygon.map(([x]) => x));
    const ys = buildings.flatMap((item) => item.polygon.map(([, y]) => y));
    const margin = 70;
    const minX = Math.min(...xs) - margin;
    const minY = Math.min(...ys) - margin;
    box = {
      x: minX,
      y: minY,
      w: Math.max(200, Math.max(...xs) + margin - minX),
      h: Math.max(200, Math.max(...ys) + margin - minY),
    };
  }
  if (input.view !== "area" && selectedBuilding) {
    const bounds = polygonBounds(selectedBuilding.polygon);
    const margin = Math.max(25, (bounds.maxX - bounds.minX) * 0.22);
    box = {
      x: bounds.minX - margin,
      y: bounds.minY - margin,
      w: bounds.maxX - bounds.minX + margin * 2,
      h: bounds.maxY - bounds.minY + margin * 2,
    };
  }

  const svg = make("svg", {
    viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`,
    class: "map",
    preserveAspectRatio: "xMidYMid meet",
  }) as SVGSVGElement;
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    `Map of ${scene.area} with ${buildings.length} mapped buildings`,
  );

  // The whole scene is drawn y-up, then flipped once, so metres read the way a
  // site plan reads rather than the way a screen counts pixels.
  const flip = make("g", { transform: `translate(0 ${box.y * 2 + box.h}) scale(1 -1)` });
  svg.append(flip);

  flip.append(make("rect", { x: box.x, y: box.y, width: box.w, height: box.h, class: "map-ground" }));

  // Casing first, then the fill on top: the standard way a road reads on a map.
  for (const pass of ["map-road-casing", "map-road"] as const) {
    for (const road of scene.r) {
      const points = parsePath(road.p);
      if (points.length < 2) continue;
      const base = ROAD_WIDTH[road.c] ?? 5;
      flip.append(
        make("polyline", {
          points: points.map((p) => p.join(",")).join(" "),
          class: pass,
          "stroke-width": pass === "map-road-casing" ? base + 2.5 : base,
        }),
      );
    }
  }

  const roofHeight = input.roofHeightM ?? null;
  for (const building of buildings) {
    const isSelected = building.index === selected;
    // In the shading view the buildings that matter are the ones standing
    // above this roof, so they are drawn by how far above it they stand.
    let tint: string | null = null;
    if (input.view === "shading" && !isSelected && roofHeight !== null && building.heightM !== null) {
      const rise = building.heightM - roofHeight;
      if (rise > 0) {
        const strength = Math.min(1, rise / 120);
        tint = `hsl(208 ${Math.round(20 + 30 * strength)}% ${Math.round(72 - 34 * strength)}%)`;
      }
    }
    const shape = make("polygon", {
      points: building.polygon.map((p) => p.join(",")).join(" "),
      class: isSelected ? "map-building map-building-on" : "map-building",
      // Inline style, not a fill attribute: the class rule would win over an
      // attribute and the tint would silently do nothing.
      ...(tint ? { style: `fill:${tint};stroke:#17211d80` } : {}),
      "data-building": building.index,
      tabindex: 0,
      role: "button",
      "aria-label": `Building of ${Math.round(building.areaM2).toLocaleString()} square metres`,
    });
    shape.addEventListener("click", () => input.onSelect(building.index));
    shape.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") input.onSelect(building.index);
    });
    flip.append(shape);
  }

  if (selectedBuilding && input.view === "wiring" && input.design) {
    drawWiring(flip, selectedBuilding.polygon, input.design, box);
  } else if (selectedBuilding && input.view === "shading" && input.shading) {
    drawShading(
      flip,
      // The same rows the shading was computed on: the ones that get built,
      // spread across the roof, not the full packing.
      thinRows(
        packRoof(selectedBuilding.polygon, input.latitude, { layout: input.layout }).rows,
        Math.max(0, Math.min(1, input.fillShare)),
      ),
      input.shading,
      input.blocked ?? null,
    );
  } else if (selectedBuilding && input.view === "roof") {
    const packed = packRoof(selectedBuilding.polygon, input.latitude, { layout: input.layout });
    // The recommended system is usually smaller than what the roof could hold,
    // so the rows that make the cut are spread evenly across the roof rather
    // than piled at one end, which is how the array would actually be laid out.
    const keep = Math.max(0, Math.min(1, input.fillShare));
    let carried = 0;
    const drawn = packed.rows.filter(() => {
      carried += keep;
      if (carried < 1) return false;
      carried -= 1;
      return true;
    });

    // Individual panels, not a solid bar per row. A bar says "some solar goes
    // about here"; panels say how many there are and where each one sits,
    // which is the whole point of packing them inside the real outline. Past a
    // few thousand the browser starts to feel it, so beyond that the row is
    // drawn whole and the count still comes from the packing.
    const totalDrawn = drawn.reduce((count, row) => count + row.modules, 0);
    const perPanel = totalDrawn <= 4000;
    drawn.forEach((row) => {
      if (!perPanel) {
        flip.append(make("rect", { x: row.x, y: row.y, width: row.w, height: row.h, class: "map-panel" }));
        return;
      }
      const width = row.w / Math.max(1, row.modules);
      const gap = Math.min(0.06, width * 0.06);
      for (let m = 0; m < row.modules; m += 1) {
        flip.append(
          make("rect", {
            x: row.x + m * width + gap / 2,
            y: row.y,
            width: Math.max(0.02, width - gap),
            height: row.h,
            class: "map-panel",
          }),
        );
      }
    });

    const plant = plantPositions(selectedBuilding.polygon);
    flip.append(
      make("rect", { x: plant.inverter[0] - 3, y: plant.inverter[1] - 2, width: 6, height: 4, class: "map-plant" }),
    );
    if (input.batteryKwh > 0) {
      flip.append(
        make("rect", { x: plant.battery[0] - 3.5, y: plant.battery[1] - 2.5, width: 7, height: 5, class: "map-plant map-plant-battery" }),
      );
    }

    // Dimension line along the bottom of the roof.
    const bounds = polygonBounds(selectedBuilding.polygon);
    const span = bounds.maxX - bounds.minX;
    flip.append(
      make("line", {
        x1: bounds.minX,
        y1: bounds.minY - 7,
        x2: bounds.maxX,
        y2: bounds.minY - 7,
        class: "map-dim",
      }),
    );
    const label = make("text", {
      x: (bounds.minX + bounds.maxX) / 2,
      y: -(bounds.minY - 11),
      class: "map-label",
      "text-anchor": "middle",
      "font-size": Math.max(2.5, box.w / 90),
      transform: "scale(1 -1)",
    }, `${Math.round(span)} m across`);
    flip.append(label);
  }

  // North arrow and scale bar share the map's coordinate system so the bar is
  // exactly the number of metres it claims, but sit outside the flipped group
  // so their text reads the right way up.
  const fontSize = box.w / 55;
  const barMetres = box.w > 1400 ? 400 : box.w > 700 ? 200 : box.w > 300 ? 100 : 25;
  const left = box.x + box.w * 0.03;
  const baseline = box.y + box.h * 0.94;
  const overlay = make("g", { class: "map-furniture", "font-size": fontSize });
  overlay.append(
    make("line", { x1: left, y1: baseline, x2: left + barMetres, y2: baseline, class: "map-scale" }),
    make("line", { x1: left, y1: baseline - fontSize * 0.4, x2: left, y2: baseline + fontSize * 0.4, class: "map-scale" }),
    make("line", {
      x1: left + barMetres,
      y1: baseline - fontSize * 0.4,
      x2: left + barMetres,
      y2: baseline + fontSize * 0.4,
      class: "map-scale",
    }),
    make("text", { x: left + barMetres + fontSize * 0.5, y: baseline + fontSize * 0.35, class: "map-label" }, `${barMetres} m`),
  );

  const northX = box.x + box.w * 0.96;
  const northTop = box.y + box.h * 0.05;
  overlay.append(
    make("line", { x1: northX, y1: northTop + fontSize * 1.6, x2: northX, y2: northTop, class: "map-scale" }),
    make("path", {
      d: `M ${northX - fontSize * 0.45} ${northTop + fontSize * 0.55} L ${northX} ${northTop - fontSize * 0.3} L ${northX + fontSize * 0.45} ${northTop + fontSize * 0.55} Z`,
      class: "map-north",
    }),
    make("text", { x: northX, y: northTop + fontSize * 2.8, class: "map-label", "text-anchor": "middle" }, "N"),
  );
  svg.append(overlay);

  // The container takes the box's own shape, so the drawing fills it exactly
  // and anything layered behind it (map tiles) lines up pixel for pixel.
  const shell = host.parentElement;
  if (shell) {
    const aspect = Math.min(2.4, Math.max(1.1, box.w / box.h));
    shell.style.aspectRatio = String(aspect);
  }

  host.append(svg);
  return box;
};
