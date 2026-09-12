// Writes public/sprites/manifest.json from whatever PNG files the art side has delivered.
// The game reads the manifest at build time, so it never asks the network for a file that is not
// there (CLAUDE.md T3 3.6). An empty folder gives an empty manifest and the game looks as it does
// with no art at all.

import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SPRITE_DIR = 'public/sprites';
export const MANIFEST_NAME = 'manifest.json';

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

/** Writes the manifest and hands back what went into it. */
export function writeManifest(directory) {
  mkdirSync(directory, { recursive: true });
  const files = spriteFilesIn(directory);
  writeFileSync(join(directory, MANIFEST_NAME), `${JSON.stringify(files, null, 2)}\n`, 'utf8');
  return files;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile) {
  const root = join(dirname(thisFile), '..');
  const directory = process.argv[2] ?? join(root, SPRITE_DIR);
  const files = writeManifest(directory);
  process.stdout.write(`${directory}/${MANIFEST_NAME}: ${files.length} sprites\n`);
}
