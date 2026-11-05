import { useSyncExternalStore } from 'react';
import { defaultPack } from '../packs';
import type { Macros, Preset } from '../packs/types';
import type { Quantise } from '../audio/transport';
import type { OutputProfile } from '../audio/fx';
import { engine } from '../audio/engine';
import { transport } from '../audio/transport';
import { resolveParams } from '../audio/presets';
import { idbDelete, idbGetAll, idbPut } from '../storage/idb';

export type Tab = 'riffs' | 'guitar' | 'performance';
export type Sheet = null | 'tone' | 'settings' | 'rec';

export interface CustomPreset { id: string; name: string; baseId: string; macros: Macros; created: number }

export interface AppState {
  tab: Tab;
  sheet: Sheet;
  presetId: string;
  macros: Macros;
  customPresets: CustomPreset[];
  bpm: number;
  loop: boolean;
  quantise: Quantise;
  metronome: boolean;
  fxIntensity: number;
  volume: number;
  riffVol: number;
  leadVol: number;
  profile: OutputProfile;
  scheme: 'tap' | 'strum';
  easy: boolean;
  power: boolean;
  palmMute: boolean;
  autoVib: boolean;
  fretStart: number;
  expr: number;
}

const pack = defaultPack;
const SETTINGS_KEY = 'muse-rig:settings:v1';

const initial: AppState = {
  tab: 'riffs',
  sheet: null,
  presetId: pack.presets[0].id,
  macros: { ...pack.presets[0].macros },
  customPresets: [],
  bpm: pack.bpm,
  loop: true,
  quantise: 'beat',
  metronome: false,
  fxIntensity: 1,
  volume: 0.8,
  riffVol: 0.85,
  leadVol: 1,
  profile: 'speaker',
  scheme: 'tap',
  easy: false,
  power: false,
  palmMute: false,
  autoVib: true,
  fretStart: 0,
  expr: 0.5,
};

const PERSIST: (keyof AppState)[] = ['presetId', 'macros', 'bpm', 'loop', 'quantise', 'fxIntensity', 'volume', 'riffVol', 'leadVol', 'profile', 'scheme', 'easy', 'autoVib'];

function load(): AppState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...initial, ...JSON.parse(raw) };
  } catch { /* storage unavailable: use defaults */ }
  return initial;
}

let state: AppState = load();
const listeners = new Set<() => void>();

export function getState() { return state; }

export function setState(patch: Partial<AppState>) {
  const prev = state;
  state = { ...state, ...patch };
  listeners.forEach((f) => f());
  sideEffects(prev, state);
  try {
    const out: Partial<AppState> = {};
    for (const k of PERSIST) (out as Record<string, unknown>)[k] = state[k];
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(out));
  } catch { /* ignore */ }
}

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => sel(state));
}

export function useEngine() {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot);
}

// ------------------------------------------------------------- presets
export function basePreset(id: string): Preset {
  const custom = state.customPresets.find((c) => c.id === id);
  const baseId = custom ? custom.baseId : id;
  return pack.presets.find((p) => p.id === baseId) ?? pack.presets[0];
}

export function presetName(s: AppState) {
  return s.customPresets.find((c) => c.id === s.presetId)?.name ?? basePreset(s.presetId).name;
}

export function selectPreset(id: string) {
  const custom = state.customPresets.find((c) => c.id === id);
  const macros = custom ? custom.macros : basePreset(id).macros;
  setState({ presetId: id, macros: { ...macros } });
}

export function resetToFury() {
  const p = pack.presets[0];
  setState({ presetId: p.id, macros: { ...p.macros } });
}

export async function saveCustomPreset(name: string) {
  const cp: CustomPreset = {
    id: `user:${Date.now().toString(36)}`, name: name.trim().slice(0, 28) || 'MY FURY',
    baseId: basePreset(state.presetId).id, macros: { ...state.macros }, created: Date.now(),
  };
  await idbPut('presets', cp).catch(() => {});
  setState({ customPresets: [...state.customPresets, cp], presetId: cp.id });
}

export async function deleteCustomPreset(id: string) {
  await idbDelete('presets', id).catch(() => {});
  const customPresets = state.customPresets.filter((c) => c.id !== id);
  setState({ customPresets });
  if (state.presetId === id) selectPreset(pack.presets[0].id);
}

export async function loadCustomPresets() {
  try {
    const all = await idbGetAll<CustomPreset>('presets');
    all.sort((a, b) => a.created - b.created);
    setState({ customPresets: all });
  } catch { /* IndexedDB unavailable */ }
}

// ------------------------------------------------------------- engine sync
function applyTone(s: AppState) {
  const v = basePreset(s.presetId).voicing;
  const r = resolveParams(v, s.macros, s.bpm, false);
  const l = resolveParams(v, s.macros, s.bpm, true);
  engine.setDSP('rhythm', r.dsp);
  engine.setDSP('lead', l.dsp);
  engine.setFx(r.fx);
}

function sideEffects(prev: AppState, s: AppState) {
  if (prev.presetId !== s.presetId || prev.macros !== s.macros || prev.bpm !== s.bpm || prev.customPresets !== s.customPresets) applyTone(s);
  if (prev.bpm !== s.bpm) transport.setBpm(s.bpm);
  if (prev.quantise !== s.quantise) transport.quantise = s.quantise;
  if (prev.loop !== s.loop) transport.setLoop(s.loop);
  if (prev.metronome !== s.metronome) transport.setMetronome(s.metronome);
  if (prev.volume !== s.volume) engine.setMaster(s.volume);
  if (prev.riffVol !== s.riffVol) engine.setBusVolume('rhythm', s.riffVol);
  if (prev.leadVol !== s.leadVol) engine.setBusVolume('lead', s.leadVol);
  if (prev.profile !== s.profile) engine.setProfile(s.profile);
  if (prev.fxIntensity !== s.fxIntensity) engine.setWetScale(s.fxIntensity);
  if (prev.tab !== s.tab || prev.expr !== s.expr) engine.setWah(s.tab === 'performance' ? s.expr : null);
}

/** Push the full current state into the engine (called once at boot). */
export function initEngineState() {
  applyTone(state);
  transport.bpm = state.bpm;
  transport.quantise = state.quantise;
  engine.setMaster(state.volume);
  engine.setBusVolume('rhythm', state.riffVol);
  engine.setBusVolume('lead', state.leadVol);
  engine.setProfile(state.profile);
  engine.setWetScale(state.fxIntensity);
  engine.setWah(state.tab === 'performance' ? state.expr : null);
  if (pack.samples.length) engine.loadSamples(pack.samples);
  loadCustomPresets();
}

export { pack };
