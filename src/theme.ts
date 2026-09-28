import type React from "react";
import { Easing, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

// ── Brand colours ────────────────────────────────────────────────────────────
export const colors = {
  navy: "#21528A",
  seaGreen: "#14B096",
  aqua: "#16B1C4",
  slate: "#4A5C6A",
  paper: "#F4F7FB",
  // Supporting tones derived from the palette
  navyDeep: "#0F2E52",
  navyNight: "#0A1F38",
  ink: "#1A1A1A",
  white: "#FFFFFF",
  black: "#000000",
} as const;

// ── Fonts (Google Fonts: Manrope + Source Sans 3) ───────────────────────────────────────────────────────────────────
// Manrope and Source Sans 3 variable fonts, downloaded from Google Fonts into
// /assets/fonts so renders don't depend on network access at render time.
const FONT_FILES = [
  { family: "Manrope", file: "fonts/manrope_variable_latin.woff2" },
  { family: "Source Sans 3", file: "fonts/source_sans_3_variable_latin.woff2" },
];
for (const f of FONT_FILES) {
  loadFont({ family: f.family, url: staticFile(f.file), weight: "200 900", format: "woff2" });
}

export const fonts = {
  heading: "Manrope, sans-serif",
  body: "'Source Sans 3', sans-serif",
} as const;

// ── Motion ───────────────────────────────────────────────────────────────────
// Calm, engineered easing. No bounce, no spring overshoot.
export const ease = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
} as const;

// ── Type scale (px at 1920×1080) ─────────────────────────────────────────────
export const type = {
  display: 120,
  h1: 84,
  h2: 56,
  h3: 40,
  body: 32,
  eyebrow: 22,
  caption: 26,
} as const;

export const eyebrowStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontWeight: 600,
  fontSize: type.eyebrow,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};
