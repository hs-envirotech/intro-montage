import { getStaticFiles, staticFile } from "remotion";

const VIDEO_EXT = [".mp4", ".mov", ".webm", ".m4v"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const AUDIO_EXT = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];

const stripExt = (p: string) => p.replace(/\.[^/.]+$/, "");
const ext = (p: string) => (p.match(/\.[^/.]+$/)?.[0] ?? "").toLowerCase();

const files = () => getStaticFiles().map((f) => f.name.replace(/\\/g, "/"));

export type ResolvedMedia = { src: string; kind: "video" | "image" };

/** Finds a footage file matching `path` by base name, whatever its extension. */
export const resolveMedia = (path: string): ResolvedMedia | null => {
  const base = stripExt(path);
  const match = files().find((f) => stripExt(f) === base && [...VIDEO_EXT, ...IMAGE_EXT].includes(ext(f)));
  if (!match) return null;
  return { src: staticFile(match), kind: VIDEO_EXT.includes(ext(match)) ? "video" : "image" };
};

/** First audio file inside `folder` (alphabetical), or null. */
export const resolveAudioIn = (folder: string): string | null => {
  const hit = files()
    .filter((f) => f.startsWith(folder) && AUDIO_EXT.includes(ext(f)))
    .sort()[0];
  return hit ? staticFile(hit) : null;
};
