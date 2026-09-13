// @vitest-environment jsdom
// The joiner walks (PIOTR, 13.09; CLAUDE.md T9 3.13). The art side has delivered no sheets yet, so
// these drive the loader with a sheet of their own, exactly as the office and hall tests drive the
// picture loader with a list of files of their own.

import { describe, expect, it } from 'vitest';
import { SPRITE_SCALE } from '../../src/render/sprites';
import {
  type CharacterSheet,
  animationForStation,
  characterArt,
  faceCharacter,
  facingFromScreen,
  frameAt,
  playCharacters,
  playableAnimation,
  rowFor,
  setCharacterAnimation,
} from '../../src/render/characters';
import { renderHall } from '../../src/render/hall';
import { STATION_BENCH, STATION_GATE, STATION_IDLE } from '../../src/engine/stations';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, hireNow, newGame, buyNow } from '../helpers';

/** A sheet with one direction on it, which is what the mirror rule is for. */
const WALK: CharacterSheet = {
  cellWidth: 96,
  cellHeight: 128,
  anchorX: 48,
  anchorY: 120,
  frames: 8,
  fps: 8,
  rows: { sw: 0 },
};

const SHEETS: Record<string, CharacterSheet> = { 'character.joiner.walk': WALK };
const FILES = ['character.joiner.walk.sheet.png'];
const OPTIONS = { files: FILES, sheets: SHEETS };

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = `<svg>${html}</svg>`;
  return holder;
}

/** A hall with a joiner on the books, so there is a figure with a role to draw. */
function hallWithAJoiner(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  for (const specId of ['workbench', 'locker', 'canteenSeat', 'toolCabinet', 'handToolSet']) {
    state = buyNow(state, specId, specId === 'workbench' ? 'budget' : undefined);
  }
  const hired = hireNow(state, 'joiner', 'poor');
  // He starts the next working day; the hall draws the men who are in today (CLAUDE.md T2 3.8).
  for (const worker of hired.workers) worker.startDay = hired.clock.day;
  return hired;
}

describe('a figure with a sheet', () => {
  it('is an image clipped to one cell, and no capsule', () => {
    const state = hallWithAJoiner();
    const svg = renderHall(state, { characters: SHEETS, files: [...FILES] });
    const joiner = state.workers.find((worker) => worker.role === 'joiner');
    expect(joiner).toBeDefined();
    const page = document.createElement('div');
    page.innerHTML = svg;
    const figure = page.querySelector(`[data-worker="${joiner?.id}"]`);
    expect(figure).not.toBeNull();
    expect(figure?.querySelector('[data-character="joiner"]')).not.toBeNull();
    expect(figure?.querySelector('image')).not.toBeNull();
    // The capsule is gone from his group, and his name is still under him.
    expect(figure?.querySelector('rect')).toBeNull();
    expect(figure?.querySelector('.figure-label')).not.toBeNull();
  });

  it('stands on its anchor, halved like every other sprite', () => {
    const art = characterArt('joiner', 'walk', 'sw', OPTIONS) ?? '';
    const node = parse(art).querySelector('[data-character]');
    expect(node?.getAttribute('x')).toBe(String(-WALK.anchorX / SPRITE_SCALE));
    expect(node?.getAttribute('y')).toBe(String(-WALK.anchorY / SPRITE_SCALE));
    expect(node?.getAttribute('width')).toBe(String(WALK.cellWidth / SPRITE_SCALE));
    expect(node?.getAttribute('height')).toBe(String(WALK.cellHeight / SPRITE_SCALE));
    expect(node?.getAttribute('viewBox')).toBe(`0 0 ${WALK.cellWidth} ${WALK.cellHeight}`);
  });

  it('is the capsule for a role the art side has not drawn', () => {
    expect(characterArt('helper', 'walk', 'sw', OPTIONS)).toBeNull();
    expect(characterArt('owner', 'idle', 'sw', OPTIONS)).toBeNull();
    const state = hallWithAJoiner();
    const page = document.createElement('div');
    page.innerHTML = renderHall(state, { characters: SHEETS, files: [...FILES] });
    const owner = page.querySelector('[data-owner="1"]');
    expect(owner?.querySelector('[data-character]')).toBeNull();
    expect(owner?.querySelector('rect')).not.toBeNull();
  });

  it('falls back to idle, then to the first frame of the walk', () => {
    // Only the walk is delivered, so a man at a bench stands in frame 0 of it.
    expect(playableAnimation('joiner', 'bench', OPTIONS)).toEqual({
      animation: 'walk',
      frozen: true,
    });
    const withIdle = {
      files: FILES.concat('character.joiner.idle.sheet.png'),
      sheets: { ...SHEETS, 'character.joiner.idle': WALK },
    };
    expect(playableAnimation('joiner', 'bench', withIdle)).toEqual({
      animation: 'idle',
      frozen: false,
    });
  });
});

describe('which way he faces', () => {
  it('reads the direction off the screen vector of the slide', () => {
    expect(facingFromScreen(10, 5)).toBe('se');
    expect(facingFromScreen(-10, 5)).toBe('sw');
    expect(facingFromScreen(-10, -5)).toBe('nw');
    expect(facingFromScreen(10, -5)).toBe('ne');
  });

  it('mirrors se from sw when the sheet has only sw', () => {
    expect(rowFor(WALK, 'sw')).toEqual({ row: 0, flip: false });
    expect(rowFor(WALK, 'se')).toEqual({ row: 0, flip: true });
    // And the markup carries the flip on the group, so the name under him is not mirrored.
    const art = characterArt('joiner', 'walk', 'se', OPTIONS) ?? '';
    const holder = parse(art);
    expect(holder.querySelector('.figure-flip')?.getAttribute('transform')).toBe('scale(-1,1)');
    expect(holder.querySelector('[data-character]')?.getAttribute('data-facing')).toBe('se');
    // Turning him round again is two attributes on what is already there.
    const node = holder.querySelector('[data-character]');
    if (node === null) throw new Error('no art');
    faceCharacter(node, 'sw', OPTIONS);
    expect(node.getAttribute('data-facing')).toBe('sw');
    expect(holder.querySelector('.figure-flip')?.getAttribute('transform')).toBe('scale(1,1)');
  });

  it('has nothing to mirror from for a direction the sheet does not carry', () => {
    expect(rowFor(WALK, 'ne')).toBeNull();
    expect(characterArt('joiner', 'walk', 'ne', OPTIONS)).toBeNull();
  });
});

describe('the frames', () => {
  it('advance with real time and not with the game clock', () => {
    expect(frameAt(WALK, 0)).toBe(0);
    // Eight frames a second: an eighth of a second on is the next frame.
    expect(frameAt(WALK, 125)).toBe(1);
    expect(frameAt(WALK, 1000)).toBe(0);
    const art = characterArt('joiner', 'walk', 'sw', OPTIONS) ?? '';
    const holder = parse(art);
    const node = holder.querySelector('[data-character]');
    if (node === null) throw new Error('no art');
    expect(node.getAttribute('data-frame')).toBe('0');
    // A second of real time, and the game clock never came into it.
    playCharacters(holder, 375);
    expect(node.getAttribute('data-frame')).toBe('3');
    expect(node.getAttribute('viewBox')).toBe(
      `${3 * WALK.cellWidth} 0 ${WALK.cellWidth} ${WALK.cellHeight}`,
    );
    playCharacters(holder, 875);
    expect(node.getAttribute('data-frame')).toBe('7');
    // And a sheet with nothing to play stands on frame 0 however long it is left.
    node.setAttribute('data-fps', '0');
    playCharacters(holder, 4321);
    expect(node.getAttribute('data-frame')).toBe('0');
  });
});

describe('what he is doing', () => {
  it('is read off the station he is standing at', () => {
    expect(animationForStation(STATION_BENCH)).toBe('bench');
    expect(animationForStation('machine:tableSaw')).toBe('bench');
    expect(animationForStation(STATION_GATE)).toBe('carry');
    expect(animationForStation(STATION_IDLE)).toBe('idle');
  });

  it('is changed on the figure that is already there, and nothing is built again', () => {
    const withIdle = {
      files: FILES.concat('character.joiner.idle.sheet.png'),
      sheets: { ...SHEETS, 'character.joiner.idle': { ...WALK, frames: 2, fps: 2 } },
    };
    const art = characterArt('joiner', 'walk', 'sw', withIdle) ?? '';
    const holder = parse(art);
    const node = holder.querySelector('[data-character]');
    if (node === null) throw new Error('no art');
    const before = node;
    setCharacterAnimation(node, 'idle', withIdle);
    expect(holder.querySelector('[data-character]')).toBe(before);
    expect(node.getAttribute('data-anim')).toBe('idle');
    expect(node.getAttribute('data-frames')).toBe('2');
    expect(node.getAttribute('data-fps')).toBe('2');
    expect(node.querySelector('image')?.getAttribute('href')).toContain(
      'character.joiner.idle.sheet.png',
    );
  });
});
