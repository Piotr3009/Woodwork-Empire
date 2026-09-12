import { describe, expect, it } from 'vitest';
import { renderHall } from '../../src/render/hall';
import { renderLaptop } from '../../src/ui/laptop';
import { TILE_HEIGHT, TILE_WIDTH } from '../../src/render/iso';
import { act, buyStartingKit, firstJob, newGame, placeEnquiry } from '../helpers';

function box(svg: string): { width: number; height: number; boxWidth: number; boxHeight: number } {
  const viewBox = svg.match(/viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/);
  const width = svg.match(/ width="(\d+)"/);
  const height = svg.match(/ height="(\d+)"/);
  return {
    width: Number(width?.[1] ?? 0),
    height: Number(height?.[1] ?? 0),
    boxWidth: Number(viewBox?.[3] ?? 0),
    boxHeight: Number(viewBox?.[4] ?? 0),
  };
}

describe('the views retain intrinsic scene dimensions for viewport scaling', () => {
  it('gives the hall a width and a height equal to its view box', () => {
    for (const difficulty of ['easy', 'veryEasy', 'hard'] as const) {
      const svg = renderHall(buyStartingKit(newGame({ difficulty })));
      const size = box(svg);
      expect(size.width, difficulty).toBe(size.boxWidth);
      expect(size.height, difficulty).toBe(size.boxHeight);
      expect(size.width).toBeGreaterThan(0);
    }
  });

  it('fits the biggest hall on a 1280 px page, which is what the tile size is for', () => {
    expect(TILE_WIDTH).toBe(48);
    expect(TILE_HEIGHT).toBe(24);
    // 1280 less the 12 px padding on each side of the view.
    for (const difficulty of ['easy', 'veryEasy'] as const) {
      const size = box(renderHall(buyStartingKit(newGame({ difficulty }))));
      expect(size.width, difficulty).toBeLessThanOrEqual(1256);
    }
  });
});

describe('a job name is printed once', () => {
  it('never repeats it on a task row or a job row', () => {
    let state = buyStartingKit(newGame());
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 580, name: 'Garage shelves' });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    firstJob(state).stage = 'ready';
    const html = renderLaptop(state, { tab: 'tasks', stockSheets: '6' });
    // Every row carries the name at most once.
    for (const row of html.split('<div class="row"').slice(1)) {
      const hits = row.split('Garage shelves').length - 1;
      expect(hits, row).toBeLessThanOrEqual(1);
    }
    expect(html).not.toContain('Garage shelves · Garage shelves');
  });
});
