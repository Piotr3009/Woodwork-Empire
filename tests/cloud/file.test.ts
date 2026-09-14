// A saved game as a file (PIOTR, 14.09): the same JSON the cloud stores, refused from another build.
import { describe, expect, it } from 'vitest';
import { decodeSaveFile, encodeSaveFile, saveFileName } from '../../src/cloud/file';
import { STATE_VERSION } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

describe('a save file', () => {
  it('round-trips a game and names the file after the company and the day', () => {
    const state = buyStartingKit(newGame({ difficulty: 'easy' }));
    const text = encodeSaveFile(state, '2026-09-14T20:00:00.000Z');
    const back = decodeSaveFile(text);
    expect(back.state).toEqual(state);
    expect(back.note).toBe('Loaded from file.');
    expect(saveFileName(state)).toBe(`woodwork-empire-day1-v${STATE_VERSION}.woodwork.json`);
  });

  it('refuses a file from another build, and anything that is not a save', () => {
    const state = newGame();
    const text = encodeSaveFile(state).replace(`"stateVersion":${STATE_VERSION}`, '"stateVersion":1');
    expect(decodeSaveFile(text).state).toBeNull();
    expect(decodeSaveFile(text).note).toContain('older build');
    expect(decodeSaveFile('not json').state).toBeNull();
    expect(decodeSaveFile('{"game":"Something else"}').state).toBeNull();
  });
});
