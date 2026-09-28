// ─────────────────────────────────────────────────────────────────────────────
// Envirotech intro — single source of truth for timings, copy and footage.
// Adjust scene lengths here; everything downstream (Sequences, subtitles,
// total duration) is derived from these numbers.
// ─────────────────────────────────────────────────────────────────────────────

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/** Seconds → frames at the project frame rate. */
export const sec = (s: number) => Math.round(s * VIDEO.fps);

export type SceneId =
  | "hook"
  | "demand"
  | "whoWeAre"
  | "capabilities"
  | "proof"
  | "people"
  | "close";

export type SceneConfig = {
  id: SceneId;
  title: string;
  /** Scene length in seconds. */
  durationSec: number;
  /** Voice-over line, shown as an optional subtitle. */
  vo: string;
  /** When the VO line starts / ends, in seconds relative to scene start. */
  voInSec: number;
  voOutSec: number;
};

export const SCENES: SceneConfig[] = [
  {
    id: "hook",
    title: "1 · Hook",
    durationSec: 6,
    vo: "Every industry runs on water.",
    voInSec: 2.4,
    voOutSec: 5.6,
  },
  {
    id: "demand",
    title: "2 · The demand",
    durationSec: 8,
    vo: "And demand is growing faster than supply.",
    voInSec: 1.0,
    voOutSec: 7.4,
  },
  {
    id: "whoWeAre",
    title: "3 · Who we are",
    durationSec: 10,
    vo: "Envirotech designs, builds and operates the systems that keep it flowing.",
    voInSec: 2.0,
    voOutSec: 9.4,
  },
  {
    id: "capabilities",
    title: "4 · Capabilities",
    durationSec: 12,
    vo: "From seawater desalination to demineralisation, reclamation and reuse.",
    voInSec: 1.0,
    voOutSec: 11.2,
  },
  {
    id: "proof",
    title: "5 · Proof",
    durationSec: 10,
    vo: "Delivering critical water for data centres and petrochemical plants, backed by long-term operating commitments.",
    voInSec: 0.8,
    voOutSec: 9.4,
  },
  {
    id: "people",
    title: "6 · People",
    durationSec: 8,
    vo: "One team, accountable from first drawing to decades of operation.",
    voInSec: 0.8,
    voOutSec: 7.4,
  },
  {
    id: "close",
    title: "7 · Close",
    durationSec: 6,
    vo: "Envirotech. Water, engineered for what's next.",
    voInSec: 1.0,
    voOutSec: 5.4,
  },
];

export type SceneTiming = SceneConfig & { from: number; durationInFrames: number };

/** Scenes with absolute frame positions, laid end to end. */
export const SCENE_TIMINGS: SceneTiming[] = SCENES.reduce<SceneTiming[]>((acc, s) => {
  const prev = acc[acc.length - 1];
  const from = prev ? prev.from + prev.durationInFrames : 0;
  acc.push({ ...s, from, durationInFrames: sec(s.durationSec) });
  return acc;
}, []);

export const TOTAL_FRAMES = SCENE_TIMINGS.reduce((t, s) => t + s.durationInFrames, 0);

export const getScene = (id: SceneId) => SCENE_TIMINGS.find((s) => s.id === id)!;

// ── On-screen copy ───────────────────────────────────────────────────────────
export const COPY = {
  demand: ["Data centres", "Industry", "Cities"],
  whoWeAre: "Engineered water treatment, reuse & supply",
  capabilities: ["Desalination", "Demineralisation", "Reuse", "Supply"],
  proof: [
    { value: 150, unit: "m³/hr", label: "Portable demineralisation" },
    { value: 4000, unit: "m³/day", label: "SWRO desalination" },
    { value: 31, unit: "-year", label: "BOT concession" },
  ],
  people: ["Design", "Build", "Operate"],
  closeUrl: "hs-envirotech.com",
} as const;

// ── Footage shot list ────────────────────────────────────────────────────────
// Drop a clip into /assets/footage using the exact `file` name below and it
// replaces the labelled placeholder automatically (.mp4, .mov, .webm, .jpg,
// .png are all detected — the extension in `file` is only the suggestion).
export type Shot = { id: string; label: string; file: string };

export const SHOTS = {
  // Scene 2 — The demand
  dataCentre: { id: "dataCentre", label: "Data centre aisle", file: "footage/data_centre_aisle.mp4" },
  refineryDusk: { id: "refineryDusk", label: "Refinery at dusk", file: "footage/refinery_dusk.mp4" },
  klSkyline: { id: "klSkyline", label: "KL skyline", file: "footage/kl_skyline.mp4" },
  // Scene 4 — Capabilities
  swroRacks: { id: "swroRacks", label: "SWRO membrane racks", file: "footage/swro_membrane_racks.mp4" },
  deminSkid: { id: "deminSkid", label: "Portable demin skid", file: "footage/portable_demin_skid.mp4" },
  reclamationPlant: { id: "reclamationPlant", label: "Reclamation plant", file: "footage/reclamation_plant.mp4" },
  pipeLaying: { id: "pipeLaying", label: "Pipe laying", file: "footage/pipe_laying.mp4" },
  // Scene 5 — Proof (backgrounds behind the count-ups)
  proofDemin: { id: "proofDemin", label: "Portable demin skid in operation", file: "footage/proof_demin_skid.mp4" },
  proofSwro: { id: "proofSwro", label: "SWRO plant wide shot", file: "footage/proof_swro_plant.mp4" },
  proofOperations: { id: "proofOperations", label: "Operating plant — long-term O&M", file: "footage/proof_operations.mp4" },
  // Scene 6 — People
  engineersOnSite: { id: "engineersOnSite", label: "Engineers on site (PPE)", file: "footage/engineers_on_site.mp4" },
  controlRoom: { id: "controlRoom", label: "Control room", file: "footage/control_room.mp4" },
  teamShot: { id: "teamShot", label: "Team shot", file: "footage/team_shot.mp4" },
} satisfies Record<string, Shot>;

// ── Brand assets (auto-detected in /assets) ──────────────────────────────────
export const ASSETS = {
  /** First match found in /assets/logo is used; otherwise a Manrope wordmark. */
  logoCandidates: ["logo/envirotech_logo_white.png", "logo/envirotech_logo.svg", "logo/envirotech_logo.png"],
  /** Any audio file in /assets/music is used (first alphabetically). */
  musicFolder: "music/",
  musicFadeOutSec: 2.5,
  musicVolume: 0.8,
} as const;
