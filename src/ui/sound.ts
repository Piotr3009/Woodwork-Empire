// The sound of the workshop (PIOTR, 17.09; CLAUDE.md T19 2.10). One engine, one table, one volume
// and one mute, and nothing at all before the player's first click.
//
// The standing "no sound" line of every brief since Turn 4 is withdrawn. What replaces it is this
// file: a single Web Audio graph built the first time the player clicks anything (browsers refuse
// to start one before a gesture), a master gain the Settings modal writes to, and a table that
// says, per sound, which file it wants and what to make instead while the file is not there.
//
// Real recordings are Piotr's to make in his own workshop (docs/art/REQUESTS-T19.md). Until a file
// lands in `public/sounds/` the engine plays a quiet synthesised stand in for it, so every hook in
// the game can be heard tonight. The moment a file is there it is used instead, with no code
// change: the loader asks for the file once, on the first play, and remembers what it found.
//
// Nothing here is game state. The volume and the mute live on `state.settings.sound` and are
// pushed in; everything else is the page's, and a reloaded page starts silent and locked again.

import {
  DRILL_EVERY_SECONDS,
  HAMMER_EVERY_SECONDS,
  SOUND_ONE_SHOT_GAP_MS,
  SOUND_VOLUME_DEFAULT,
  STAND_IN_GAIN,
} from '../engine/constants';
import type { SoundSettings } from '../engine/index';

/** The sounds that play once: a door, a knock, a screw. */
export type OneShotName = 'door' | 'hammer' | 'drill';
/** The sounds that run for as long as the thing making them runs. */
export type LoopName = 'tableSaw' | 'extractor' | 'sander' | 'sprayBooth';
export type SoundName = OneShotName | LoopName;

/** What the engine makes when the recording is not there: noise through a filter for the machines,
 *  a short shaped tone for the hand tools, a soft thud for a door. */
export type StandIn = 'noise' | 'hiss' | 'rasp' | 'click' | 'buzz' | 'thud';

export interface SoundSpec {
  /** The file under `public/sounds/`, exactly as docs/art/REQUESTS-T19.md names it. */
  file: string;
  kind: 'oneShot' | 'loop';
  /** What is made while the file is not there. */
  standIn: StandIn;
  /** How loud this one is against the master [TUNE per sound]. */
  gain: number;
  /** The middle of the band the stand in is shaped around, in Hz [TUNE]. */
  hz: number;
  /** How long a one shot's stand in lasts, in seconds [TUNE]. Ignored by a loop. */
  seconds: number;
  /** The shortest gap between two of this one shot, in milliseconds. `SOUND_ONE_SHOT_GAP_MS` when
   *  the row does not say: the hammer and the drill are knocks and screws, which the brief wants
   *  every few seconds and not every second (CLAUDE.md T19 2.10). Ignored by a loop. */
  gapMs?: number;
}

/** The table: one row per sound, by event and by station (CLAUDE.md T19 2.10). */
export const SOUNDS: Record<SoundName, SoundSpec> = {
  door: { file: 'sounds/door.ogg', kind: 'oneShot', standIn: 'thud', gain: 0.6, hz: 160, seconds: 0.18 },
  hammer: {
    file: 'sounds/hammer.ogg',
    kind: 'oneShot',
    standIn: 'click',
    gain: 0.5,
    hz: 900,
    seconds: 0.06,
    gapMs: HAMMER_EVERY_SECONDS * 1000,
  },
  drill: {
    file: 'sounds/drill.ogg',
    kind: 'oneShot',
    standIn: 'buzz',
    gain: 0.4,
    hz: 220,
    seconds: 0.35,
    gapMs: DRILL_EVERY_SECONDS * 1000,
  },
  tableSaw: { file: 'sounds/tableSaw.ogg', kind: 'loop', standIn: 'noise', gain: 0.5, hz: 1400, seconds: 0 },
  extractor: { file: 'sounds/extractor.ogg', kind: 'loop', standIn: 'noise', gain: 0.3, hz: 320, seconds: 0 },
  sander: { file: 'sounds/sander.ogg', kind: 'loop', standIn: 'rasp', gain: 0.3, hz: 2200, seconds: 0 },
  sprayBooth: { file: 'sounds/sprayBooth.ogg', kind: 'loop', standIn: 'hiss', gain: 0.35, hz: 4000, seconds: 0 },
};

export const LOOP_NAMES: readonly LoopName[] = ['tableSaw', 'extractor', 'sander', 'sprayBooth'];
export const ONE_SHOT_NAMES: readonly OneShotName[] = ['door', 'hammer', 'drill'];

export function isLoopName(name: string): name is LoopName {
  return (LOOP_NAMES as readonly string[]).includes(name);
}

/** The bits of Web Audio this file uses, named so a test can hand in a fake without pulling the
 *  whole browser API in (CLAUDE.md T19 2.10: "a test with a fake audio context"). */
export interface AudioLike {
  currentTime: number;
  state?: string;
  destination: unknown;
  sampleRate: number;
  createGain(): GainLike;
  createBufferSource(): BufferSourceLike;
  createOscillator(): OscillatorLike;
  createBiquadFilter(): FilterLike;
  createBuffer(channels: number, length: number, rate: number): AudioBufferLike;
  resume?: () => Promise<void> | void;
  close?: () => Promise<void> | void;
  decodeAudioData?: (data: ArrayBuffer) => Promise<AudioBufferLike>;
}

export interface ParamLike {
  value: number;
  setValueAtTime?: (value: number, at: number) => void;
  linearRampToValueAtTime?: (value: number, at: number) => void;
  exponentialRampToValueAtTime?: (value: number, at: number) => void;
}
export interface NodeLike {
  connect(to: unknown): unknown;
  disconnect(): void;
  /** Web Audio calls this when a source has finished. A fake context need not have it. */
  onended?: (() => void) | null;
}
export interface GainLike extends NodeLike {
  gain: ParamLike;
}
export interface AudioBufferLike {
  getChannelData?: (channel: number) => Float32Array;
  length?: number;
}
export interface BufferSourceLike extends NodeLike {
  buffer: AudioBufferLike | null;
  loop: boolean;
  playbackRate?: ParamLike;
  start(when?: number): void;
  stop(when?: number): void;
}
export interface OscillatorLike extends NodeLike {
  type: string;
  frequency: ParamLike;
  start(when?: number): void;
  stop(when?: number): void;
}
export interface FilterLike extends NodeLike {
  type: string;
  frequency: ParamLike;
  Q?: ParamLike;
}

type ContextFactory = () => AudioLike | null;

interface Running {
  source: BufferSourceLike | OscillatorLike;
  gain: GainLike;
}

const NOTHING_YET = -1e9;

let factory: ContextFactory = defaultFactory;
let context: AudioLike | null = null;
let master: GainLike | null = null;
let unlocked = false;
let volume = SOUND_VOLUME_DEFAULT;
let muted = false;
const running = new Map<LoopName, Running>();
const lastOneShotMs = new Map<OneShotName, number>();
/** What the loader found for each sound: the decoded recording, or null for "use the stand in".
 *  Undefined while nobody has looked. */
const recordings = new Map<SoundName, AudioBufferLike | null>();
/** One count per sound of everything that was actually started, for the tests. */
const played = new Map<SoundName, number>();

function defaultFactory(): AudioLike | null {
  const holder = globalThis as unknown as {
    AudioContext?: new () => AudioLike;
    webkitAudioContext?: new () => AudioLike;
  };
  const Ctor = holder.AudioContext ?? holder.webkitAudioContext;
  if (Ctor === undefined) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

/** Hands the engine another way of making a context, for the fake context test. Passing null puts
 *  the browser's own back. */
export function setAudioContextFactory(next: ContextFactory | null): void {
  factory = next ?? defaultFactory;
}

/** Whether the player's first click has happened. Nothing plays before it: a browser refuses to
 *  start an audio context without a gesture, and a game that shouted at the player the moment the
 *  page opened would deserve to be refused (CLAUDE.md T19 2.10). */
export function soundIsUnlocked(): boolean {
  return unlocked && context !== null;
}

/** The player has clicked something. Called from the one click handler, on every click: after the
 *  first it costs a comparison. */
export function unlockSound(): void {
  if (unlocked) return;
  unlocked = true;
  const made = factory();
  if (made === null) return;
  context = made;
  const gain = made.createGain();
  gain.gain.value = muted ? 0 : volume;
  gain.connect(made.destination);
  master = gain;
  if (made.state === 'suspended' && typeof made.resume === 'function') void made.resume();
}

/** The volume and the mute off the saved settings. Safe before the unlock: it remembers them and
 *  the graph is built with them. */
export function applySoundSettings(settings: SoundSettings): void {
  volume = Math.min(1, Math.max(0, settings.volume));
  muted = settings.muted;
  if (master !== null) master.gain.value = muted ? 0 : volume;
  // A mute is not a quieter hall, it is a silent one: what was already running is taken down with
  // it, so the engine's own list never says the saw is going while nothing can be heard, and a
  // loop that could not start while it was on cannot be left out when it comes off. The frame
  // says what the hall sounds like again at the next `setLoops` (CLAUDE.md T19 2.10).
  if (muted) stopAllSounds();
}

/** Everything stops and the page goes silent: a scene change, a load, or the end of a test. */
export function stopAllSounds(): void {
  for (const name of Array.from(running.keys())) loop(name, false);
}

/** Forgets the whole engine, for a test that wants it built again from nothing. */
export function resetSound(): void {
  stopAllSounds();
  if (context !== null && typeof context.close === 'function') {
    try {
      void context.close();
    } catch {
      // A fake context need not close, and a closed one need not close twice.
    }
  }
  context = null;
  master = null;
  unlocked = false;
  volume = SOUND_VOLUME_DEFAULT;
  muted = false;
  running.clear();
  lastOneShotMs.clear();
  recordings.clear();
  played.clear();
}

/** Noise, shaped: what a saw and a fan are made of while the recordings are not there. One second
 *  of it, looped, is enough at this volume and it costs one buffer. */
function noiseBuffer(ctx: AudioLike): AudioBufferLike | null {
  const length = Math.max(1, Math.floor(ctx.sampleRate));
  let buffer: AudioBufferLike;
  try {
    buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  } catch {
    return null;
  }
  const data = buffer.getChannelData?.(0);
  if (data === undefined) return buffer;
  // A cheap deterministic hiss: no Math.random anywhere in this repository, and a fixed noise
  // sounds no different from a random one (CLAUDE.md, the engine's rule, kept here too).
  let seed = 22026;
  for (let at = 0; at < data.length; at += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[at] = (seed / 0x3fffffff) - 1;
  }
  return buffer;
}

function standInFor(ctx: AudioLike, spec: SoundSpec, out: GainLike): Running | null {
  const shaped = ctx.createGain();
  shaped.gain.value = STAND_IN_GAIN * spec.gain;
  shaped.connect(out);
  if (spec.standIn === 'noise' || spec.standIn === 'hiss' || spec.standIn === 'rasp') {
    const buffer = noiseBuffer(ctx);
    if (buffer === null) return null;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = spec.standIn === 'noise' ? 'lowpass' : 'bandpass';
    filter.frequency.value = spec.hz;
    if (filter.Q !== undefined) filter.Q.value = spec.standIn === 'rasp' ? 0.7 : 1;
    source.connect(filter);
    filter.connect(shaped);
    source.start();
    return { source, gain: shaped };
  }
  // A thud, a click and a buzz are one shaped tone each, and they stop themselves.
  const osc = ctx.createOscillator();
  osc.type = spec.standIn === 'buzz' ? 'sawtooth' : spec.standIn === 'click' ? 'square' : 'sine';
  osc.frequency.value = spec.hz;
  osc.connect(shaped);
  const now = ctx.currentTime;
  shaped.gain.setValueAtTime?.(STAND_IN_GAIN * spec.gain, now);
  shaped.gain.linearRampToValueAtTime?.(0, now + spec.seconds);
  osc.start();
  osc.stop(now + spec.seconds);
  return { source: osc, gain: shaped };
}

function fromRecording(
  ctx: AudioLike,
  buffer: AudioBufferLike,
  spec: SoundSpec,
  out: GainLike,
): Running | null {
  const shaped = ctx.createGain();
  shaped.gain.value = spec.gain;
  shaped.connect(out);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = spec.kind === 'loop';
  source.connect(shaped);
  source.start();
  return { source, gain: shaped };
}

/** Asks for the recording once. A file that is not there, or a browser that will not decode it,
 *  is remembered as "there is none" and the stand in is used from then on. Nothing waits for it:
 *  the first play is the stand in and the recording takes over at the next one. */
function wantRecording(name: SoundName): AudioBufferLike | null {
  const known = recordings.get(name);
  if (known !== undefined) return known;
  recordings.set(name, null);
  const ctx = context;
  if (ctx === null || typeof ctx.decodeAudioData !== 'function') return null;
  if (typeof fetch !== 'function') return null;
  const spec = SOUNDS[name];
  void (async (): Promise<void> => {
    try {
      const answer = await fetch(spec.file);
      if (!answer.ok) return;
      const bytes = await answer.arrayBuffer();
      const decoded = await ctx.decodeAudioData?.(bytes);
      if (decoded !== undefined) recordings.set(name, decoded);
    } catch {
      // No file, no decoder, no network: the stand in stands in. That is the whole design.
    }
  })();
  return null;
}

/** Everything a sound was made of, let go of. A loop is taken down by `loop(name, false)`; a one
 *  shot has nobody to take it down, so it takes itself down when it has finished. Without this an
 *  hour of knocking leaves an hour of finished gains hanging off the master. */
function release(made: Running): void {
  try {
    made.source.disconnect();
    made.gain.disconnect();
  } catch {
    // A graph already in pieces is the state we wanted anyway.
  }
}

function start(name: SoundName): Running | null {
  const ctx = context;
  const out = master;
  if (ctx === null || out === null) return null;
  const spec = SOUNDS[name];
  const recording = wantRecording(name);
  const made =
    recording === null ? standInFor(ctx, spec, out) : fromRecording(ctx, recording, spec, out);
  if (made === null) return null;
  played.set(name, (played.get(name) ?? 0) + 1);
  if (spec.kind === 'oneShot') {
    made.source.onended = (): void => {
      release(made);
    };
  }
  return made;
}

/** A sound that happens once: a door swinging, a knock, a screw going in. Thinned to one a second
 *  per sound, so x10 and x30 do not rattle (CLAUDE.md T19 2.10). */
export function play(name: OneShotName, nowMs: number): void {
  if (!soundIsUnlocked() || muted) return;
  const last = lastOneShotMs.get(name) ?? NOTHING_YET;
  if (nowMs - last < (SOUNDS[name].gapMs ?? SOUND_ONE_SHOT_GAP_MS)) return;
  lastOneShotMs.set(name, nowMs);
  start(name);
}

/** A sound that runs while the thing making it runs: the saw while somebody is at it, the fan
 *  while it pulls, the sander and the booth while somebody is on them. On is idempotent, and so
 *  is off: the caller says what the hall looks like this frame and the engine sorts itself out. */
export function loop(name: LoopName, on: boolean): void {
  const already = running.get(name);
  if (on) {
    if (!soundIsUnlocked() || muted) return;
    if (already !== undefined) return;
    const made = start(name);
    if (made !== null) running.set(name, made);
    return;
  }
  if (already === undefined) return;
  running.delete(name);
  try {
    already.source.stop();
  } catch {
    // A source that has already stopped itself, or a fake that does not stop at all.
  }
  release(already);
}

/** Turns on exactly the loops in this set and turns off every other one. The one call the frame
 *  makes: it says what the hall sounds like now and never what changed. */
export function setLoops(on: ReadonlySet<LoopName>): void {
  for (const name of LOOP_NAMES) loop(name, on.has(name));
}

/** What the engine is doing, for the tests and nobody else. */
export function soundStateForTests(): {
  unlocked: boolean;
  muted: boolean;
  volume: number;
  loops: LoopName[];
  played: Record<string, number>;
  masterGain: number | null;
} {
  return {
    unlocked: soundIsUnlocked(),
    muted,
    volume,
    loops: Array.from(running.keys()).sort(),
    played: Object.fromEntries(played),
    masterGain: master === null ? null : master.gain.value,
  };
}
