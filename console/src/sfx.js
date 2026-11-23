// Console audio: original tones synthesized with Web Audio, optionally replaced per sound with
// files shared through Home Assistant's media library (same set on every tablet).
import { signal } from '@preact/signals';
import { LS } from './ha.js';

const KEY = 'bridgeline.bedroom.sound';
export const soundOn = signal(LS.get(KEY) ?? true);
export function toggleSound() { soundOn.value = !soundOn.value; LS.set(KEY, soundOn.value); if (soundOn.value) sfx('on'); }

let ctx = null;
function ac() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// [freqStart, freqEnd, startOffsetSec, durationSec, wave]
const VOICES = {
  tap:     [[1320, 1320, 0, 0.045, 'sine'], [1760, 1760, 0.05, 0.05, 'sine']],
  nav:     [[880, 1480, 0, 0.08, 'sine']],
  on:      [[990, 990, 0, 0.05, 'sine'], [1320, 1320, 0.055, 0.05, 'sine'], [1760, 1760, 0.11, 0.07, 'sine']],
  off:     [[1760, 1760, 0, 0.05, 'sine'], [1320, 1320, 0.055, 0.05, 'sine'], [990, 990, 0.11, 0.07, 'sine']],
  command: [[1175, 1175, 0, 0.04, 'triangle'], [1568, 1568, 0.045, 0.04, 'triangle'], [2093, 2093, 0.09, 0.04, 'triangle'], [1568, 1568, 0.135, 0.06, 'triangle']],
  slide:   [[1100, 1400, 0, 0.06, 'sine']],
  fault:   [[220, 220, 0, 0.12, 'square'], [185, 185, 0.15, 0.16, 'square']],
  alert:   [[740, 1110, 0, 0.18, 'sawtooth'], [1110, 740, 0.2, 0.18, 'sawtooth'], [740, 1110, 0.4, 0.18, 'sawtooth'], [1110, 740, 0.6, 0.18, 'sawtooth']],
  arm:     [[660, 660, 0, 0.08, 'square'], [660, 660, 0.12, 0.08, 'square']],
  dooralarm: [[880, 880, 0, 0.16, 'square'], [622, 622, 0.18, 0.16, 'square'], [880, 880, 0.36, 0.16, 'square'], [622, 622, 0.54, 0.16, 'square'], [880, 880, 0.72, 0.16, 'square'], [622, 622, 0.9, 0.3, 'square']],
  event:   [[784, 784, 0, 0.09, 'sine'], [1047, 1047, 0.11, 0.09, 'sine'], [1319, 1319, 0.22, 0.09, 'sine'], [1047, 1047, 0.5, 0.09, 'sine'], [1319, 1319, 0.61, 0.09, 'sine'], [1568, 1568, 0.72, 0.16, 'sine']],
};
const LEVEL = { dooralarm: 0.06, fault: 0.06, alert: 0.07, arm: 0.06, event: 0.16 };

/* ---------- shared custom sounds (Home Assistant media library) ----------
   Files live in HA's local media folder `bridgeline-sounds/`, named `<slot>--<epoch ms>.<ext>`.
   Every tablet lists that folder, downloads the newest file per slot, and plays it in place of the
   built-in tone. Upload/reset need an HA admin user; playback works for any user. */
export const SOUND_SLOTS = [
  ['tap', 'BUTTON', 'GENERAL BUTTON PRESS'],
  ['nav', 'PAGE', 'CHANGING PAGES'],
  ['on', 'SWITCH ON', 'TURNING SOMETHING ON'],
  ['off', 'SWITCH OFF', 'TURNING SOMETHING OFF'],
  ['command', 'COMMAND', 'ROUTINES, SCENES'],
  ['slide', 'SLIDER', 'RELEASING A SLIDER'],
  ['arm', 'ARM', 'GARAGE FIRST TAP'],
  ['dooralarm', 'DOOR OPENING ALARM', 'GARAGE SECOND TAP'],
  ['event', 'EVENT START', 'CALENDAR EVENT BEGINS'],
  ['alert', 'VISITOR', 'FRONT DOOR VISITOR'],
  ['fault', 'FAULT', 'COMMAND FAILED'],
];
const SLOT_KEYS = new Set(SOUND_SLOTS.map(([k]) => k));
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_SECONDS = 10;
const FOLDER_NAME = 'bridgeline-sounds';
const TYPES = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', webm: 'audio/webm', flac: 'audio/flac' };

/** slot → { id, at (upload time ms) } for slots with a shared file */
export const custom = signal({});
/** idle | syncing | ok | error */
export const soundSync = signal({ state: 'idle', msg: '' });
const buffers = {};   // slot → { id, buf, gain }
let files = {};       // slot → [{ id, at }] newest first (all copies in the folder)
let media = null;     // { browse, resolve, upload, remove, fetchUrl } supplied by the app
let folderId = null;

async function decode(data) {
  const c = ac(); if (!c) throw new Error('NO AUDIO');
  return c.decodeAudioData(data.slice(0));
}
/** Auto-level: scale every file to a common loudness so uploads match each other and the built-in tones. */
function levelFor(buf) {
  let sum = 0, peak = 0, n = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i += 4) { const v = Math.abs(d[i]); sum += v * v; if (v > peak) peak = v; n++; }
  }
  const rms = Math.sqrt(sum / Math.max(1, n)) || 0.0001;
  return Math.min(0.12 / rms, 0.9 / (peak || 1), 4);
}

async function resolveFolder() {
  if (folderId) return folderId;
  try { await media.browse('media-source://media_source/local'); folderId = `media-source://media_source/local/${FOLDER_NAME}`; return folderId; } catch {}
  const root = await media.browse('media-source://media_source');
  const dir = root?.children?.find((c) => c.can_expand)?.media_content_id;
  const m = dir?.match(/^media-source:\/\/media_source\/([^/]+)/);
  folderId = `media-source://media_source/${m ? m[1] : 'local'}/${FOLDER_NAME}`;
  return folderId;
}

/** Wire the shared store to the active HA link and start syncing. Safe to call more than once. */
let pollTimer = null;
export function startSoundSync(api) {
  media = api;
  refreshSounds();
  clearInterval(pollTimer);
  pollTimer = setInterval(refreshSounds, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshSounds(); });
}

let syncing = null;
export function refreshSounds() {
  if (!media) return Promise.resolve();
  if (syncing) return syncing;
  syncing = (async () => {
    soundSync.value = { state: 'syncing', msg: '' };
    try {
      const folder = await resolveFolder();
      let listing = null;
      try { listing = await media.browse(folder); } catch { listing = { children: [] }; } // folder appears with the first upload
      const next = {};
      for (const c of listing?.children ?? []) {
        const m = (c.title ?? '').match(/^([a-z]+)--(\d+)\.[a-z0-9]+$/i);
        if (!m || !SLOT_KEYS.has(m[1])) continue;
        (next[m[1]] ??= []).push({ id: c.media_content_id, at: +m[2] });
      }
      for (const k of Object.keys(next)) next[k].sort((a, b) => b.at - a.at);
      files = next;
      const meta = {};
      for (const [slot, list] of Object.entries(next)) {
        const top = list[0];
        if (buffers[slot]?.id !== top.id) {
          try {
            const r = await media.resolve(top.id);
            const data = await (await media.fetchUrl(r.url)).arrayBuffer();
            const buf = await decode(data);
            buffers[slot] = { id: top.id, buf, gain: levelFor(buf) };
          } catch { continue; }
        }
        meta[slot] = { id: top.id, at: top.at };
      }
      for (const slot of Object.keys(buffers)) if (!next[slot]) delete buffers[slot];
      custom.value = meta;
      soundSync.value = { state: 'ok', msg: '' };
    } catch (e) {
      soundSync.value = { state: 'error', msg: e?.message ?? 'SYNC FAILED' };
    } finally { syncing = null; }
  })();
  return syncing;
}

/** Validate locally, upload to HA, remove the slot's older copies, then resync. Throws a short console-style message on failure. */
export async function setCustomSound(kind, file) {
  if (!media) throw new Error('NO HOME ASSISTANT LINK');
  if (!file) return;
  if (file.size > MAX_BYTES) throw new Error('FILE OVER 2 MB');
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = file.type && file.type.startsWith('audio/') ? file.type : TYPES[ext];
  if (!type) throw new Error('UNSUPPORTED AUDIO FORMAT');
  let buf;
  try { buf = await decode(await file.arrayBuffer()); } catch { throw new Error('UNSUPPORTED AUDIO FORMAT'); }
  if (buf.duration > MAX_SECONDS) throw new Error(`SOUND OVER ${MAX_SECONDS} SECONDS`);
  const named = new File([file], `${kind}--${Date.now()}.${TYPES[ext] ? ext : 'mp3'}`, { type });
  const folder = await resolveFolder();
  const old = files[kind] ?? [];
  await media.upload(folder, named);
  for (const f of old) { try { await media.remove(f.id); } catch {} }
  await refreshSounds();
}
export async function clearCustomSound(kind) {
  if (!media) throw new Error('NO HOME ASSISTANT LINK');
  for (const f of files[kind] ?? []) await media.remove(f.id);
  await refreshSounds();
}
/** Preview a slot regardless of the AUDIO ON/OFF switch. */
export function previewSound(kind) { play(kind, true); }

export function sfx(kind = 'tap') { play(kind, false); }

function play(kind, force) {
  if (!force && !soundOn.peek()) return;
  const c = ac(); if (!c) return;
  if (buffers[kind]) {
    const src = c.createBufferSource(); const g = c.createGain();
    src.buffer = buffers[kind].buf; g.gain.value = buffers[kind].gain;
    src.connect(g).connect(c.destination); src.start();
    return;
  }
  const v = VOICES[kind]; if (!v) return;
  const t0 = c.currentTime + 0.005;
  const peak = LEVEL[kind] ?? 0.14;
  for (const [f1, f2, at, dur, wave] of v) {
    const o = c.createOscillator(); const g = c.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f1, t0 + at);
    if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t0 + at + dur);
    g.gain.setValueAtTime(0, t0 + at);
    g.gain.linearRampToValueAtTime(peak, t0 + at + 0.006);
    g.gain.setValueAtTime(peak, t0 + at + dur - 0.012);
    g.gain.linearRampToValueAtTime(0, t0 + at + dur);
    o.connect(g).connect(c.destination);
    o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
  }
}
