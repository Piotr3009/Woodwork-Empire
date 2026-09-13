// Writes public/sprites/manifest.json from whatever PNG files the art side has delivered.
// The game reads the manifest at build time, so it never asks the network for a file that is not
// there (CLAUDE.md T3 3.6). An empty folder gives an empty manifest and the game looks as it does
// with no art at all.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SPRITE_DIR = 'public/sprites';
export const MANIFEST_NAME = 'manifest.json';
/** The character sheets' own manifest: the JSON the art side delivers beside each sheet, gathered
 *  into one file the game can import. A sheet is a picture and a set of numbers, and the numbers
 *  cannot be fetched at render time (CLAUDE.md T9 3.13). */
export const CHARACTERS_NAME = 'characters.json';

/** The PNG names out of a list, sorted, so the manifest does not change with the file system. */
export function pickPngs(names) {
  return names
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort((left, right) => left.localeCompare(right));
}

/** Every PNG in the folder. A folder that is not there yet is an empty folder. */
export function spriteFilesIn(directory) {
  if (!existsSync(directory)) return [];
  return pickPngs(readdirSync(directory));
}

/** Every character JSON in the folder, read into one object keyed by its own name without the
 *  extension: character.joiner.walk.json becomes character.joiner.walk. */
export function charactersIn(directory) {
  if (!existsSync(directory)) return {};
  const names = readdirSync(directory)
    .filter((name) => name.startsWith('character.') && name.toLowerCase().endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));
  const out = {};
  for (const name of names) {
    const key = name.slice(0, -'.json'.length);
    out[key] = JSON.parse(readFileSync(join(directory, name), 'utf8'));
  }
  return out;
}

/** Writes both manifests and hands back what went into them. */
export function writeManifest(directory) {
  mkdirSync(directory, { recursive: true });
  const files = spriteFilesIn(directory);
  writeFileSync(join(directory, MANIFEST_NAME), `${JSON.stringify(files, null, 2)}\n`, 'utf8');
  const characters = charactersIn(directory);
  writeFileSync(
    join(directory, CHARACTERS_NAME),
    `${JSON.stringify(characters, null, 2)}\n`,
    'utf8',
  );
  return files;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile) {
  const root = join(dirname(thisFile), '..');
  const directory = process.argv[2] ?? join(root, SPRITE_DIR);
  const files = writeManifest(directory);
  process.stdout.write(`${directory}/${MANIFEST_NAME}: ${files.length} sprites\n`);
}
