// ─────────────────────────────────────────────────────────────────────────────
// Envirotech — 60-second brand film. Single source of truth for timings, VO,
// on-screen copy, verified project facts and footage slots.
// Change a scene's `durationSec` and everything downstream follows.
// ─────────────────────────────────────────────────────────────────────────────

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

/** Seconds → frames at the project frame rate. */
export const sec = (s: number) => Math.round(s * VIDEO.fps);

export type SceneId = "origin" | "technology" | "engineering" | "lifecycle" | "projects" | "silverstreams" | "reveal";

export type SceneConfig = { id: SceneId; title: string; durationSec: number };

export const SCENES: SceneConfig[] = [
  { id: "origin", title: "1 · Water / origin", durationSec: 7 },
  { id: "technology", title: "2 · Water technology", durationSec: 10 },
  { id: "engineering", title: "3 · Technology to engineering", durationSec: 10 },
  { id: "lifecycle", title: "4 · Engineering through operation", durationSec: 10 },
  { id: "projects", title: "5 · Project experience", durationSec: 10 },
  { id: "silverstreams", title: "6 · Silverstreams", durationSec: 7 },
  { id: "reveal", title: "7 · Envirotech reveal", durationSec: 6 },
];

export type SceneTiming = SceneConfig & { from: number; durationInFrames: number };

export const SCENE_TIMINGS: SceneTiming[] = SCENES.reduce<SceneTiming[]>((acc, s) => {
  const prev = acc[acc.length - 1];
  const from = prev ? prev.from + prev.durationInFrames : 0;
  acc.push({ ...s, from, durationInFrames: sec(s.durationSec) });
  return acc;
}, []);

/** Frames each scene runs on into the next while the next pushes through it. */
export const SCENE_OVERLAP = 10;

export const TOTAL_FRAMES = SCENE_TIMINGS.reduce((t, s) => t + s.durationInFrames, 0);

export const getScene = (id: SceneId) => SCENE_TIMINGS.find((s) => s.id === id)!;

// ── Voice-over (no audio yet — shown as optional review subtitles) ──────────
// Times are absolute seconds in the film. Calm pace: ~2.6 words per second.
// The final reveal (54–60s) is deliberately left without VO.
export const VO: { text: string; inSec: number; outSec: number }[] = [
  { text: "Water is the foundation of everything we build.", inSec: 3.4, outSec: 6.6 },
  { text: "At Envirotech, we integrate water and wastewater technologies with engineering, infrastructure and operations.", inSec: 7.6, outSec: 13.4 },
  { text: "From ultrafiltration and reverse osmosis, to desalination, water reclamation and integrated water systems.", inSec: 13.8, outSec: 19.6 },
  { text: "From engineering and project delivery, through operation and long-term performance.", inSec: 27.6, outSec: 32.4 },
  { text: "With experience across project management and industrial water,", inSec: 38.0, outSec: 41.8 },
  { text: "and new data-centre water infrastructure now entering delivery.", inSec: 47.2, outSec: 50.4 },
  { text: "Envirotech. Integrated water solutions, from engineering through operation.", inSec: 50.6, outSec: 53.9 },
];

// ── On-screen copy ───────────────────────────────────────────────────────────
export const COPY = {
  origin: "Water",
  technology: [
    { short: "UF", long: "Ultrafiltration" },
    { short: "RO", long: "Reverse osmosis" },
    { short: "", long: "Desalination" },
    { short: "", long: "Water reclamation" },
  ],
  engineering: ["Engineer", "Integrate", "Deliver"],
  lifecycle: ["Design", "Engineer", "Build", "Operate"],
  deliveryModels: ["EPCC", "O&M", "BOT"],
  // Subtle line under the logo in the final reveal.
  slogan: "Securing water for the next generation",
} as const;

// ── Verified project experience ─────────────────────────────────────────────
// ONLY these facts may appear. Do not add capacities, dates, values, statuses
// or roles that are not listed here. All figures below were supplied by Envirotech.
export const PROJECTS = {
  prpcUf: {
    // Delivered project experience. Figures from Envirotech's PRPC project spotlight.
    eyebrow: "Project experience",
    name: "PRPC UF",
    location: "Pengerang, Johor",
    scope: "Portable demineralised water treatment",
    quality: "Ultrapure · low-silica water",
    delivery: "Design · Supply · Install · Commission · O&M",
    stats: [
      { value: 1.47, decimals: 2, unit: "million m³", label: "Ultrapure water delivered" },
      { value: 3.6, decimals: 1, unit: "MLD", label: "Design capacity · 150 m³/hr" },
      { value: 4.0, decimals: 1, unit: "MLD", label: "Peak production · 167 m³/hr" },
      { value: 24, decimals: 0, unit: "/7", label: "Round-the-clock operations" },
    ],
  },
  // Shown in this order: EMAS Project (MRCSB) first, then PRPC UF.
  emas: {
    // Envirotech role: PMC only. Not EPCC contractor, technology owner,
    // equipment supplier or operator.
    eyebrow: "Project experience",
    name: "EMAS Project",
    role: "PMC",
    client: "MRCSB",
  },
  silverstreams: {
    // Awarded concession. NOT completed, NOT operational — never say so.
    name: "Silverstreams",
    status: "Awarded concession",
    plant: "4 MLD SWRO desalination plant",
    process: ["DAF", "UF", "RO"],
    model: "20+10-year BOT concession",
  },
} as const;

// ── Footage slots ────────────────────────────────────────────────────────────
// Every slot has a procedural fallback, so the film is complete without
// footage. Drop a clip into /assets/footage with the file name below and it
// replaces the fallback automatically (.mp4 .mov .webm .jpg .png).
export type Shot = { id: string; label: string; file: string };

export const SHOTS = {
  prpcUf: { id: "prpcUf", label: "PRPC UF site, Pengerang — portable demin units", file: "footage/prpc_uf_site.mp4" },
  // Shown in this order: EMAS Project (MRCSB) first, then PRPC UF.
  emas: { id: "emas", label: "EMAS Project site — coordination / PMC", file: "footage/emas_project_site.mp4" },
  silverstreams: { id: "silverstreams", label: "Silverstreams concept render (DAF · UF · RO compound)", file: "footage/silverstreams_render.jpg" },
} satisfies Record<string, Shot>;

// ── Audio ────────────────────────────────────────────────────────────────────
export const ASSETS = {
  /**
   * Music: the original score "Confluence" (scripts/compose_score.mts). Any
   * other track you drop into /assets/music is used in preference to it.
   */
  musicFolder: "music/",
  generatedScore: "music/envirotech_score.wav",
  /** Skip into your track by this many seconds (e.g. to land its drop on the 54 s reveal). */
  musicStartSec: 0,
  /** Fade-out on the final beat. */
  musicFadeOutSec: 1.5,
  musicVolume: 1,
} as const;
