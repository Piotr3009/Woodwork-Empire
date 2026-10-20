/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v123: the yacht line's pictures [PIOTR, 20.10: "graphics only": the art side's pack, its pictures
// alone]. Twelve stations of sixteen frames and an empty picture each, byte for byte as the pack
// has them, WebP at half the game's canvas (the pack's own scale, drawn into the station's box like
// any picture); the class picture the last frame; the waiting yacht the pack's loaded transporter
// moved onto the game's canvas by a shift alone. The stations are drawn by their frames as the house
// factory's are (v117).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LINE_KINDS, YACHT_MODULE_SIZE, YACHT_WORK_FRAMES, lineModulesOf } from '../../src/engine/constants';
import { isWorkingDay } from '../../src/engine/clock';
import { answerLineOffer, endLineContract, lineState, lineUnitFrame, runningLineContract } from '../../src/engine/lineContract';
import { deliveredFile, pictureFor } from '../../src/engine/ports';
import type { GameState } from '../../src/engine/index';
import { renderHall } from '../../src/render/hall';
import { spriteFileSize, spriteFiles } from '../../src/render/sprites';
import { clearEvents, nextDay } from '../helpers';
import { yachtLine } from '../yachtLine';

function hashOf(name: string): string {
  return createHash('sha256').update(readFileSync(join('public/sprites', name))).digest('hex');
}

/** The canvas a WebP says it has: the extended header the pack's pictures carry (`VP8X`). */
function webpSize(name: string): { width: number; height: number } {
  const bytes = readFileSync(join('public/sprites', name));
  expect(bytes.toString('latin1', 0, 4), name).toBe('RIFF');
  expect(bytes.toString('latin1', 8, 16), name).toBe('WEBPVP8X');
  return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
}

function pngSize(name: string): { width: number; height: number } {
  const head = readFileSync(join('public/sprites', name)).subarray(16, 24);
  return { width: head.readUInt32BE(0), height: head.readUInt32BE(4) };
}

function page(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The yacht line on its contract the next working morning, its stores full. */
function running(): GameState {
  let state = nextDay(yachtLine());
  for (let guard = 0; guard < 5 && !isWorkingDay(state.clock.day); guard += 1) state = nextDay(state);
  state = clearEvents(state);
  state.stock.boards = 1000;
  state.stock.glass = 500;
  const record = lineState(state, 1);
  if (record.contract === null) throw new Error('the yacht line s contract is written');
  record.contract.status = 'offered';
  answerLineOffer(state, 1, 'take');
  if (runningLineContract(state, 1) === null) throw new Error('the contract runs');
  return state;
}

describe('the files of the yacht pack (v123)', () => {
  it('are sixteen frames, an empty picture and the class picture a station, WebP at half the station s canvas', () => {
    const owed = spriteFileSize(YACHT_MODULE_SIZE.width, YACHT_MODULE_SIZE.depth, YACHT_MODULE_SIZE.height);
    expect(owed).toEqual({ width: 1168, height: 1168 });
    for (const id of lineModulesOf('yacht')) {
      const names = [
        `${id}.standard.webp`,
        `${id}.standard.empty.webp`,
        ...Array.from({ length: YACHT_WORK_FRAMES }, (_, frame) => `${id}.standard.work${String(frame).padStart(2, '0')}.webp`),
      ];
      for (const name of names) {
        expect(spriteFiles(), name).toContain(name);
        // The pack's own scale, half the game's: drawn into the station's box, exactly as a file of
        // the full canvas would be, sharp at the hall's own size and softer zoomed in past it.
        expect(webpSize(name), name).toEqual({ width: owed.width / 2, height: owed.height / 2 });
      }
      expect(hashOf(`${id}.standard.webp`)).toBe(hashOf(`${id}.standard.work15.webp`));
      // The line is never turned, and no PNG of a station has landed: the WebP is what is drawn.
      expect(spriteFiles()).not.toContain(`${id}.standard.png`);
      expect(spriteFiles()).not.toContain(`${id}.standard.r.webp`);
    }
  });

  it('are the art side s files byte for byte, each held to the pack s own record', () => {
    const lines = readFileSync('docs/art/pack-y1-2010/checksums.sha256', 'utf8').trim().split('\n');
    expect(lines).toHaveLength(12 * (YACHT_WORK_FRAMES + 2));
    for (const line of lines) {
      const [hash, name] = line.split(/\s+/);
      expect(hashOf(name ?? ''), name).toBe(hash);
    }
  });

  it('hold the waiting yacht on half the transporter s canvas, as a PNG', () => {
    const wait = LINE_KINDS.yacht.wait;
    if (wait === null) throw new Error('a yacht waits on its lane');
    const owed = spriteFileSize(wait.width, wait.depth, wait.height);
    expect(owed).toEqual({ width: 928, height: 664 });
    expect(spriteFiles()).toContain('yachtWaiting.standard.png');
    expect(pngSize('yachtWaiting.standard.png')).toEqual({ width: owed.width / 2, height: owed.height / 2 });
  });

  it('are found by the one picture rule, the WebP where no PNG has landed and the PNG first where both have', () => {
    expect(deliveredFile(['a.webp'], 'a.png')).toBe('a.webp');
    expect(deliveredFile(['a.png', 'a.webp'], 'a.png')).toBe('a.png');
    expect(deliveredFile(['b.webp'], 'a.png')).toBeNull();
    expect(pictureFor(spriteFiles(), 'yachtLine3', 'standard', 0)).toEqual({ file: 'yachtLine3.standard.webp', mirrored: false });
    expect(pictureFor(['yachtLine3.standard.webp', 'yachtLine3.standard.png'], 'yachtLine3', 'standard', 0)).toEqual({
      file: 'yachtLine3.standard.png',
      mirrored: false,
    });
  });
});

describe('the stations drawn by their frames (v123)', () => {
  it('draws every station from the frame of the yacht in hand, and the empty station without a contract', () => {
    const state = running();
    lineState(state, 1).minutes = 480;
    expect(lineUnitFrame(state, 1, YACHT_WORK_FRAMES)).toBe(8);
    const framesOn = (): string[] => {
      const hall = page(renderHall(state));
      return lineModulesOf('yacht').map((id) => {
        const station = hall.querySelector(`[data-sprite="${id}"]`);
        return `${station?.getAttribute('data-station-frame')}:${station?.querySelector('image')?.getAttribute('href')}`;
      });
    };
    expect(framesOn()).toEqual(lineModulesOf('yacht').map((id) => `work08:/sprites/${id}.standard.work08.webp`));
    endLineContract(state, 1);
    expect(framesOn()).toEqual(lineModulesOf('yacht').map((id) => `empty:/sprites/${id}.standard.empty.webp`));
  });

  it('draws each station in its own box, decoded before it is painted', () => {
    const hall = page(renderHall(running()));
    const images = lineModulesOf('yacht').map((id) => hall.querySelector(`[data-sprite="${id}"] image`));
    for (const image of images) {
      expect(image?.getAttribute('decoding')).toBe('sync');
      // The station's box: 584 by 584 in the hall's units, the whole of the half sized file.
      expect([image?.getAttribute('width'), image?.getAttribute('height')]).toEqual(['584', '584']);
    }
  });
});
