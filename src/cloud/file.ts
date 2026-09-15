// A saved game as a file on the player's own computer: no account, no server (PIOTR, 14.09).
// The same JSON the cloud stores, wrapped with the state version, so a file from another build of
// the game is refused with a note rather than loaded into an engine that no longer matches it.
import { STATE_VERSION } from '../engine/index';
import { migrateState } from '../engine/migrate';
import type { GameState } from '../engine/types';

export const SAVE_FILE_EXTENSION = '.woodwork.json';

export interface SaveFile {
  game: 'Woodwork Empire';
  stateVersion: number;
  savedAt: string;
  state: GameState;
}

/** The text of a save file for this state. */
export function encodeSaveFile(state: GameState, savedAt = new Date().toISOString()): string {
  const file: SaveFile = { game: 'Woodwork Empire', stateVersion: STATE_VERSION, savedAt, state };
  return JSON.stringify(file);
}

/** A file name the player can find again: company, day, version. */
export function saveFileName(state: GameState): string {
  const company = state.companyName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${company || 'woodwork-empire'}-day${state.clock.day}-v${STATE_VERSION}${SAVE_FILE_EXTENSION}`;
}

/** The state inside a save file, or the reason there is none. */
export function decodeSaveFile(text: string): { state: GameState | null; note: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { state: null, note: 'That is not a save file.' };
  }
  if (typeof parsed !== 'object' || parsed === null) return { state: null, note: 'That is not a save file.' };
  const file = parsed as Partial<SaveFile>;
  if (file.game !== 'Woodwork Empire' || typeof file.state !== 'object' || file.state === null) {
    return { state: null, note: 'That is not a Woodwork Empire save file.' };
  }
  if (file.stateVersion === STATE_VERSION) return { state: file.state, note: 'Loaded from file.' };
  // A save from the build before this one is lifted into this one's shape; anything older is
  // refused, as it always was (CLAUDE.md T12 2.3).
  const lifted = typeof file.stateVersion === 'number' ? migrateState(file.state, file.stateVersion) : null;
  if (lifted === null) return { state: null, note: 'That save is from an older build of the game.' };
  return { state: lifted, note: 'Loaded from file.' };
}
