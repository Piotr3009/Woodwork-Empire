// Every state the character system can be in has a frame key, and a missing frame falls back to
// idle rather than to nothing (CLAUDE.md T13 3.23). Read against the sheets the art side has
// delivered on this branch, and against sheets a test hands in.

import { describe, expect, it } from 'vitest';
import {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_PHONE,
  STATION_RACK,
} from '../../src/engine/stations';
import {
  ANIMATIONS,
  animationForStation,
  characterArt,
  characterSheet,
  playableAnimation,
  rowFor,
} from '../../src/render/characters';
import type { Animation, CharacterSheet, Facing } from '../../src/render/characters';

const ROLES = [
  'owner',
  'joiner',
  'helper',
  'officeAdmin',
  'purchasingClerk',
  'salesman',
  'draftsman',
  'estimator',
  'productionManager',
];

const FACINGS: Facing[] = ['sw', 'se', 'nw', 'ne'];

/** A sheet with only the rows given, for a role the art side has not delivered. */
function sheet(rows: Partial<Record<Facing, number>>): CharacterSheet {
  return { cellWidth: 96, cellHeight: 96, anchorX: 48, anchorY: 90, frames: 8, fps: 4, rows };
}

describe('the states and their frame keys', () => {
  it('names an animation for every station a figure can stand at, all of them on the list', () => {
    expect(animationForStation(STATION_BENCH)).toBe('bench');
    expect(animationForStation('machine:tableSaw')).toBe('bench');
    // Nobody walks on the spot: carry is the walker's, on a leg (CLAUDE.md T16 2.2).
    expect(animationForStation(STATION_GATE)).toBe('idle');
    expect(animationForStation(STATION_RACK)).toBe('bench');
    expect(animationForStation(STATION_PHONE)).toBe('phone');
    expect(animationForStation(STATION_IDLE)).toBe('idle');
    expect(animationForStation('office')).toBe('idle');
    for (const station of [STATION_BENCH, STATION_GATE, STATION_RACK, STATION_PHONE, STATION_IDLE]) {
      expect(ANIMATIONS).toContain(animationForStation(station));
    }
    // Walking is the slide between two stations, and it is on the list too.
    expect(ANIMATIONS).toContain('walk');
  });
});

describe('the fallback of a missing frame', () => {
  it('plays the animation asked for wherever the art side has delivered it', () => {
    // The home frame is a Turn 13 key nobody has painted yet (CLAUDE.md T13 3.23): it falls back
    // to idle for every role until the art side delivers it, and is listed in the art request.
    // Sweep is the same kind of key for everybody but the helper, whose broom sheet came in with
    // the v28 patch (CLAUDE.md T20 2.8).
    const undrawn = ['home', 'sweep'];
    for (const animation of ANIMATIONS.filter((entry) => !undrawn.includes(entry))) {
      expect(playableAnimation('owner', animation), animation).toEqual({ animation, frozen: false });
    }
    for (const animation of ANIMATIONS.filter(
      (entry) => entry !== 'phone' && !undrawn.includes(entry),
    )) {
      expect(playableAnimation('joiner', animation), animation).toEqual({ animation, frozen: false });
    }
    expect(playableAnimation('owner', 'home')).toEqual({ animation: 'idle', frozen: false });
    expect(playableAnimation('owner', 'sweep')).toEqual({ animation: 'idle', frozen: false });
    expect(playableAnimation('helper', 'sweep')).toEqual({ animation: 'sweep', frozen: false });
  });

  it('falls back to idle, playing, for an animation the role has no sheet for', () => {
    // A joiner never takes a call, so the phone is not delivered for him: idle stands in.
    expect(characterSheet('joiner', 'phone')).toBeNull();
    expect(playableAnimation('joiner', 'phone')).toEqual({ animation: 'idle', frozen: false });
    expect(characterArt('joiner', 'phone', 'sw')).toContain('data-anim="idle"');
  });

  it('falls back to the first frame of the walk, standing, when there is no idle either', () => {
    const options = {
      files: ['character.helper.walk.sheet.png'],
      sheets: { 'character.helper.walk': sheet({ sw: 0, se: 1, nw: 2, ne: 3 }) },
    };
    expect(playableAnimation('helper', 'bench', options)).toEqual({ animation: 'walk', frozen: true });
    expect(playableAnimation('helper', 'idle', options)).toEqual({ animation: 'walk', frozen: true });
    // Frozen means no frames per second: the figure stands, it does not walk on the spot.
    expect(characterArt('helper', 'bench', 'sw', options)).toContain('data-fps="0"');
  });

  it('draws nothing for a role with no sheet at all, and the caller stands the capsule', () => {
    // The owner, the joiner and, since v28, the helper have their sheets (the helper's from
    // Piotr's GPT pack, 18.09); every other role is the capsule until his own lands.
    const drawn = ['owner', 'joiner', 'helper'];
    for (const role of ROLES.filter((entry) => !drawn.includes(entry))) {
      for (const animation of ANIMATIONS) {
        expect(playableAnimation(role, animation), `${role} ${animation}`).toBeNull();
        expect(characterArt(role, animation, 'sw'), `${role} ${animation}`).toBeNull();
      }
    }
  });

  it('needs both halves of a sheet: numbers without a picture draw nothing', () => {
    const options = {
      files: [],
      sheets: { 'character.helper.idle': sheet({ sw: 0 }) },
    };
    expect(playableAnimation('helper', 'idle', options)).toBeNull();
  });
});

describe('the four directions', () => {
  it('are all drawable on every delivered sheet, by their own row or by a mirror', () => {
    for (const role of ['owner', 'joiner']) {
      for (const animation of ANIMATIONS) {
        const found = characterSheet(role, animation);
        if (found === null) continue;
        for (const facing of FACINGS) {
          expect(rowFor(found.sheet, facing), `${role} ${animation} ${facing}`).not.toBeNull();
        }
      }
    }
  });

  it('mirrors a missing direction from its opposite, with a flip', () => {
    const half = sheet({ sw: 0, nw: 1 });
    expect(rowFor(half, 'sw')).toEqual({ row: 0, flip: false });
    expect(rowFor(half, 'se')).toEqual({ row: 0, flip: true });
    expect(rowFor(half, 'nw')).toEqual({ row: 1, flip: false });
    expect(rowFor(half, 'ne')).toEqual({ row: 1, flip: true });
  });

  it('draws nothing, rather than idle, for a direction a sheet has neither row nor mirror for', () => {
    // A sheet with only the south rows: north is unreachable. The art draws nothing and the
    // capsule stands; it does not try the idle sheet's north row. Noted for the render side.
    const options = {
      files: ['character.helper.walk.sheet.png', 'character.helper.idle.sheet.png'],
      sheets: {
        'character.helper.walk': sheet({ sw: 0, se: 1 }),
        'character.helper.idle': sheet({ sw: 0, se: 1, nw: 2, ne: 3 }),
      },
    };
    expect(characterArt('helper', 'walk', 'sw', options)).not.toBeNull();
    expect(characterArt('helper', 'walk', 'nw', options)).toBeNull();
  });
});

/** Every animation key a role can be asked for, so the table in the report is the code's list. */
export const FRAME_KEYS: readonly Animation[] = ANIMATIONS;

describe('the helper has his own sheets (v28, from the GPT pack of 18.09)', () => {
  it('draws the helper from his walk, idle and carry sheets, and falls back to idle for the rest', () => {
    for (const animation of ['walk', 'idle', 'carry'] as const) {
      expect(playableAnimation('helper', animation)?.frozen, animation).toBe(false);
      expect(characterArt('helper', animation, 'ne'), animation).toContain('character.helper');
    }
    // No bench sheet in the pack: the standing animation falls back and still draws him.
    expect(characterArt('helper', 'bench', 'sw')).toContain('character.helper');
  });
});
