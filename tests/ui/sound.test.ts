// The sound of the workshop (PIOTR, 17.09; CLAUDE.md T19 2.10). One engine, one table, one volume
// and one mute, and nothing at all before the player's first click.
//
// The whole of it is driven through a fake audio context handed in with `setAudioContextFactory`,
// which is what that seam is for: no browser, no stubbed global, and the fake counts what was
// built so "nothing plays before the unlock" can be proved by the context never being made at all.
// The fake deliberately has no `decodeAudioData`, so the loader never asks for a recording and
// every sound in here is the synthesised stand in, which is what ships tonight.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DRILL_EVERY_SECONDS,
  HAMMER_EVERY_SECONDS,
  SOUND_ONE_SHOT_GAP_MS,
  SOUND_VOLUME_DEFAULT,
  STAND_IN_GAIN,
} from '../../src/engine/constants';
import { labourDone, stagePlanFor } from '../../src/engine/index';
import type { GameState, StageId } from '../../src/engine/index';
import { hallLoops, hallOneShots } from '../../src/render/hall';
import {
  LOOP_NAMES,
  ONE_SHOT_NAMES,
  SOUNDS,
  applySoundSettings,
  loop,
  play,
  resetSound,
  setAudioContextFactory,
  setLoops,
  soundIsUnlocked,
  soundStateForTests,
  stopAllSounds,
  unlockSound,
} from '../../src/ui/sound';
import type {
  AudioBufferLike,
  FilterLike,
  GainLike,
  LoopName,
  ParamLike,
} from '../../src/ui/sound';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
} from '../helpers';

// ---------------------------------------------------------------------------
// The fake context
// ---------------------------------------------------------------------------

interface TrackedParam extends ParamLike {
  value: number;
}

interface TrackedGain extends GainLike {
  gain: TrackedParam;
  connected: number;
  disconnected: number;
}

/** One fake that stands in for both a buffer source and an oscillator: the engine treats them the
 *  same way and the test only wants to know what was started, stopped and let go of. */
interface TrackedSource {
  buffer: AudioBufferLike | null;
  loop: boolean;
  type: string;
  frequency: TrackedParam;
  started: number;
  stopped: number;
  disconnected: number;
  onended?: (() => void) | null;
  connect(): unknown;
  disconnect(): void;
  start(): void;
  stop(): void;
}

interface FakeContext {
  currentTime: number;
  state: string;
  destination: unknown;
  sampleRate: number;
  sources: TrackedSource[];
  gains: TrackedGain[];
  createGain(): TrackedGain;
  createBufferSource(): TrackedSource;
  createOscillator(): TrackedSource;
  createBiquadFilter(): FilterLike;
  createBuffer(channels: number, length: number, rate: number): AudioBufferLike;
}

function trackedParam(): TrackedParam {
  const holder: TrackedParam = {
    value: 0,
    setValueAtTime(next: number): void {
      holder.value = next;
    },
    linearRampToValueAtTime(): void {
      // The fake does not ramp: the engine only asks it to fade a stand in out.
    },
  };
  return holder;
}

/** A context that records everything it is asked for and makes no sound. It has no
 *  `decodeAudioData`, which is how `wantRecording` is told there is no recording to be had. */
function fakeContext(): FakeContext {
  const sources: TrackedSource[] = [];
  const gains: TrackedGain[] = [];
  function source(): TrackedSource {
    const node: TrackedSource = {
      buffer: null,
      loop: false,
      type: 'sine',
      frequency: trackedParam(),
      started: 0,
      stopped: 0,
      disconnected: 0,
      onended: null,
      connect: () => undefined,
      disconnect(): void {
        node.disconnected += 1;
      },
      start(): void {
        node.started += 1;
      },
      stop(): void {
        node.stopped += 1;
      },
    };
    sources.push(node);
    return node;
  }
  return {
    currentTime: 0,
    state: 'running',
    destination: { name: 'destination' },
    sampleRate: 44100,
    sources,
    gains,
    createGain(): TrackedGain {
      const node: TrackedGain = {
        gain: trackedParam(),
        connected: 0,
        disconnected: 0,
        connect(): unknown {
          node.connected += 1;
          return node;
        },
        disconnect(): void {
          node.disconnected += 1;
        },
      };
      gains.push(node);
      return node;
    },
    createBufferSource: source,
    createOscillator: source,
    createBiquadFilter(): FilterLike {
      return {
        type: 'lowpass',
        frequency: trackedParam(),
        Q: trackedParam(),
        connect: () => undefined,
        disconnect: () => undefined,
      };
    },
    createBuffer(_channels: number, length: number): AudioBufferLike {
      return { length, getChannelData: () => new Float32Array(length) };
    },
  };
}

let context: FakeContext = fakeContext();
let built = 0;

beforeEach(() => {
  context = fakeContext();
  built = 0;
  setAudioContextFactory(() => {
    built += 1;
    return context;
  });
});

afterEach(() => {
  resetSound();
  setAudioContextFactory(null);
});

// ---------------------------------------------------------------------------
// The halls the sounds are read off
// ---------------------------------------------------------------------------

/** A hall with the day 1 kit in it and nothing happening. */
function quietHall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 20);
  state.enquiries = [];
  return state;
}

/** The same hall with somebody standing at the named machine. */
function somebodyAt(state: GameState, specId: string): GameState {
  const machine = state.equipment.find((item) => item.specId === specId);
  if (machine === undefined) throw new Error(`no ${specId} in the hall`);
  machine.takenBy = 'owner';
  return state;
}

/** A hall with one job in production, standing at the named stage, finished the named way. */
function jobAt(stage: StageId, finish = 'laminate'): GameState {
  let state = quietHall();
  const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 60, finish: finish as never });
  state = acceptNow(state, enquiry.id);
  const job = firstJob(state);
  job.stage = 'inProduction';
  job.assignees = ['owner'];
  const plan = stagePlanFor(state, job);
  const target = plan.find((entry) => entry.id === stage);
  if (target === undefined) throw new Error(`no ${stage} in this job's plan`);
  // Half way through the stage, so nothing about a boundary decides what is heard.
  job.labourRemaining = job.labourValue - (target.from + target.to) / 2;
  expect(labourDone(job)).toBeGreaterThan(0);
  return state;
}

describe('nothing plays before the first click (CLAUDE.md T19 2.10)', () => {
  it('does not so much as build the audio context', () => {
    play('door', 0);
    play('hammer', 0);
    loop('tableSaw', true);
    setLoops(new Set<LoopName>(['tableSaw', 'extractor']));
    expect(built).toBe(0);
    expect(context.sources).toHaveLength(0);
    expect(context.gains).toHaveLength(0);
    const sound = soundStateForTests();
    expect(sound.unlocked).toBe(false);
    expect(sound.loops).toEqual([]);
    expect(sound.played).toEqual({});
    expect(sound.masterGain).toBeNull();
  });

  it('builds it once on the first click, at the saved volume, and never again', () => {
    unlockSound();
    unlockSound();
    unlockSound();
    expect(built).toBe(1);
    expect(soundIsUnlocked()).toBe(true);
    expect(soundStateForTests().masterGain).toBe(SOUND_VOLUME_DEFAULT);
    // The master is the one thing hanging off the destination.
    expect(context.gains).toHaveLength(1);
    expect(context.gains[0]?.connected).toBe(1);
  });
});

describe('the volume and the mute', () => {
  it('put the volume on the master gain', () => {
    unlockSound();
    applySoundSettings({ volume: 0.4, muted: false });
    expect(soundStateForTests().masterGain).toBeCloseTo(0.4);
    applySoundSettings({ volume: 1, muted: false });
    expect(soundStateForTests().masterGain).toBe(1);
    // Out of range is brought back into it rather than handed to the browser.
    applySoundSettings({ volume: 4, muted: false });
    expect(soundStateForTests().masterGain).toBe(1);
    applySoundSettings({ volume: -1, muted: false });
    expect(soundStateForTests().masterGain).toBe(0);
  });

  it('silences everything when it is muted, and brings it back when it is not', () => {
    unlockSound();
    setLoops(new Set<LoopName>(['tableSaw']));
    play('door', 0);
    expect(soundStateForTests().loops).toEqual(['tableSaw']);
    expect(soundStateForTests().played['door']).toBe(1);

    applySoundSettings({ volume: 0.7, muted: true });
    expect(soundStateForTests().masterGain).toBe(0);
    // Nothing new is made while it is off: not a one shot, not a loop.
    play('door', 10_000);
    setLoops(new Set<LoopName>(['tableSaw', 'sander']));
    expect(soundStateForTests().played['door']).toBe(1);
    expect(soundStateForTests().loops).toEqual([]);

    applySoundSettings({ volume: 0.7, muted: false });
    expect(soundStateForTests().masterGain).toBeCloseTo(0.7);
    setLoops(new Set<LoopName>(['tableSaw', 'sander']));
    expect(soundStateForTests().loops).toEqual(['sander', 'tableSaw']);
    play('door', 20_000);
    expect(soundStateForTests().played['door']).toBe(2);
  });
});

describe('the loops follow the hall', () => {
  it('runs exactly the named loops and stops the ones that drop out', () => {
    unlockSound();
    setLoops(new Set<LoopName>(['tableSaw']));
    expect(soundStateForTests().loops).toEqual(['tableSaw']);
    const saw = context.sources[0];
    expect(saw?.started).toBe(1);
    expect(saw?.loop).toBe(true);
    // Saying the same thing again changes nothing: the frame may say it sixty times a second.
    setLoops(new Set<LoopName>(['tableSaw']));
    expect(context.sources).toHaveLength(1);

    setLoops(new Set<LoopName>(['extractor']));
    expect(soundStateForTests().loops).toEqual(['extractor']);
    expect(saw?.stopped).toBe(1);
    expect(saw?.disconnected).toBe(1);

    stopAllSounds();
    expect(soundStateForTests().loops).toEqual([]);
  });

  it('is on at the saw only while somebody is at the saw', () => {
    const idle = quietHall();
    expect(Array.from(hallLoops(idle))).toEqual([]);
    expect(Array.from(hallOneShots(idle))).toEqual([]);
    const cutting = somebodyAt(quietHall(), 'tableSaw');
    expect(hallLoops(cutting).has('tableSaw')).toBe(true);

    unlockSound();
    setLoops(hallLoops(cutting));
    expect(soundStateForTests().loops).toContain('tableSaw');
    setLoops(hallLoops(idle));
    expect(soundStateForTests().loops).toEqual([]);
  });

  it('pulls the extraction while a machine on it is running, and not a minute longer', () => {
    // The day 1 kit already carries an extractor, which is what the saw is piped to.
    const cutting = somebodyAt(quietHall(), 'tableSaw');
    const on = hallLoops(cutting);
    expect(on.has('tableSaw')).toBe(true);
    expect(on.has('extractor')).toBe(true);
    // Nobody at a machine, nothing for the fan to pull: the extractor stands there silent.
    expect(hallLoops(quietHall()).has('extractor')).toBe(false);
  });

  it('knocks and screws at a bench that is assembling, and nothing else', () => {
    const assembling = jobAt('assembly');
    expect(Array.from(hallOneShots(assembling)).sort()).toEqual(['drill', 'hammer']);
    expect(hallLoops(assembling).has('sander')).toBe(false);

    unlockSound();
    for (const name of hallOneShots(assembling)) play(name, 0);
    const played = soundStateForTests().played;
    expect(played['hammer']).toBe(1);
    expect(played['drill']).toBe(1);
  });

  it('sands a bench that is finishing, and sprays only when somebody is at a booth', () => {
    expect(hallLoops(jobAt('finishing')).has('sander')).toBe(true);
    expect(hallLoops(jobAt('finishing')).has('sprayBooth')).toBe(false);
    // A lacquered job is not a sander: lacquer goes to the booth and hands and paper do not.
    const lacquered = jobAt('finishing', 'lacquer');
    expect(hallLoops(lacquered).has('sander')).toBe(false);
    // And it is not a booth either, until there is a booth with somebody standing at it. A
    // workshop with no booth cannot spray and must not be heard to (CLAUDE.md T19 2.10; the hall's
    // own reading of itself, T19-B1d).
    expect(hallLoops(lacquered).has('sprayBooth')).toBe(false);
    const booth = placeEquipment(lacquered, 'sprayBooth', { x: 14, y: 7 });
    expect(hallLoops(lacquered).has('sprayBooth')).toBe(false);
    booth.takenBy = 'owner';
    expect(hallLoops(lacquered).has('sprayBooth')).toBe(true);
  });
});

describe('the one shots are thinned', () => {
  it('lets a door through once a second and no more', () => {
    unlockSound();
    play('door', 0);
    play('door', 1);
    play('door', SOUND_ONE_SHOT_GAP_MS - 1);
    expect(soundStateForTests().played['door']).toBe(1);
    play('door', SOUND_ONE_SHOT_GAP_MS);
    expect(soundStateForTests().played['door']).toBe(2);
  });

  it('gives the hammer and the drill their own few seconds', () => {
    // The brief asks for knocks every few seconds, not every second (CLAUDE.md T19 2.10).
    expect(SOUNDS.hammer.gapMs).toBe(HAMMER_EVERY_SECONDS * 1000);
    expect(SOUNDS.drill.gapMs).toBe(DRILL_EVERY_SECONDS * 1000);
    unlockSound();
    // Offered every frame for four seconds, as the hall offers it.
    for (let at = 0; at <= 4000; at += 16) play('hammer', at);
    expect(soundStateForTests().played['hammer']).toBe(2);
    for (let at = 0; at <= 4000; at += 16) play('drill', at);
    expect(soundStateForTests().played['drill']).toBe(2);
    // Every gap is at least the one second the brief caps them at.
    for (const name of ONE_SHOT_NAMES) {
      expect(SOUNDS[name].gapMs ?? SOUND_ONE_SHOT_GAP_MS).toBeGreaterThanOrEqual(
        SOUND_ONE_SHOT_GAP_MS,
      );
    }
  });
});

describe('with no recordings in public/sounds', () => {
  it('plays the quiet stand in for every sound in the table, and throws for none of them', () => {
    unlockSound();
    let at = 0;
    for (const name of ONE_SHOT_NAMES) {
      expect(() => play(name, at)).not.toThrow();
      at += 10_000;
    }
    for (const name of LOOP_NAMES) expect(() => loop(name, true)).not.toThrow();
    expect(soundStateForTests().loops).toEqual([...LOOP_NAMES].sort());
    const played = soundStateForTests().played;
    for (const name of [...ONE_SHOT_NAMES, ...LOOP_NAMES]) expect(played[name]).toBe(1);
    // Quietly: every stand in is made at STAND_IN_GAIN times its own row's gain, under the master.
    const shaped = context.gains.slice(1).map((gain) => gain.gain.value);
    expect(shaped).toHaveLength(ONE_SHOT_NAMES.length + LOOP_NAMES.length);
    for (const value of shaped) expect(value).toBeLessThanOrEqual(STAND_IN_GAIN);
    expect(shaped).toContain(STAND_IN_GAIN * SOUNDS.door.gain);
  });

  it('lets a finished one shot go, so an hour of knocking leaves nothing hanging on the master', () => {
    unlockSound();
    play('hammer', 0);
    const knock = context.sources[0];
    expect(knock?.onended).toBeTypeOf('function');
    knock?.onended?.();
    expect(knock?.disconnected).toBe(1);
  });
});

describe('resetSound', () => {
  it('leaves it silent and locked again', () => {
    unlockSound();
    setLoops(new Set<LoopName>(['tableSaw']));
    play('door', 0);
    applySoundSettings({ volume: 0.2, muted: true });
    resetSound();
    const sound = soundStateForTests();
    expect(sound.unlocked).toBe(false);
    expect(sound.loops).toEqual([]);
    expect(sound.played).toEqual({});
    expect(sound.muted).toBe(false);
    expect(sound.volume).toBe(SOUND_VOLUME_DEFAULT);
    expect(sound.masterGain).toBeNull();
  });
});

describe('the engine when the browser will not play (CLAUDE.md T19 2.10, found by the review)', () => {
  it('gives the next click another go when the first could not build a context', () => {
    // A browser with audio off, or a page in a sandboxed frame, answers with nothing. Latching the
    // unlock before knowing that left the game silent for the whole session with no second try.
    resetSound();
    setAudioContextFactory(() => null);
    unlockSound();
    expect(soundIsUnlocked()).toBe(false);
    const made = fakeContext();
    let builds = 0;
    setAudioContextFactory(() => {
      builds += 1;
      return made;
    });
    unlockSound();
    expect(soundIsUnlocked()).toBe(true);
    // And still only one context, however many clicks follow it.
    unlockSound();
    unlockSound();
    expect(builds).toBe(1);
  });

  it('lets go of the gain when a stand in cannot be built, however many frames ask for it', () => {
    // A loop that cannot start is asked for again on the next frame, so a gain left hanging off
    // the master here is a gain a frame for as long as the hall runs.
    resetSound();
    const made = fakeContext();
    made.createBuffer = (): AudioBufferLike => {
      throw new Error('no buffers here');
    };
    setAudioContextFactory(() => made);
    unlockSound();
    for (let at = 0; at < 60; at += 1) setLoops(new Set<LoopName>(['tableSaw', 'extractor']));
    expect(soundStateForTests().loops).toEqual([]);
    // Every gain the engine built was let go of again, but the master, which stays.
    const hanging = made.gains.filter((gain) => gain.connected > gain.disconnected);
    expect(hanging).toHaveLength(1);
  });

  it('refuses a volume that is not a number, rather than putting NaN on the master', () => {
    // Math.max(0, NaN) is NaN, so clamping alone let it through, and a NaN gain throws in Web
    // Audio, which used to take the frame loop with it (CLAUDE.md T19 2.10).
    const opened = newGame();
    const bad = act(opened, { type: 'SET_SOUND', volume: Number.NaN });
    expect(bad.settings.sound.volume).toBe(opened.settings.sound.volume);
    const worse = act(opened, { type: 'SET_SOUND', volume: Number.POSITIVE_INFINITY });
    expect(worse.settings.sound.volume).toBe(opened.settings.sound.volume);
    // A real figure still lands, and is still clamped at both ends.
    expect(act(opened, { type: 'SET_SOUND', volume: 0.25 }).settings.sound.volume).toBe(0.25);
    expect(act(opened, { type: 'SET_SOUND', volume: 9 }).settings.sound.volume).toBe(1);
    expect(act(opened, { type: 'SET_SOUND', volume: -9 }).settings.sound.volume).toBe(0);
  });

  it('does not throw when the context answers a buffer with nothing', () => {
    // The frame loop asks for itself at the end of itself, so a throw in here used to stop the
    // game dead. app.ts re-arms the frame whatever happens now, and this end does not throw.
    resetSound();
    const made = fakeContext();
    made.createBuffer = (): AudioBufferLike => undefined as unknown as AudioBufferLike;
    setAudioContextFactory(() => made);
    unlockSound();
    expect(() => setLoops(new Set<LoopName>(['tableSaw']))).not.toThrow();
    expect(soundStateForTests().loops).toEqual([]);
  });
});
