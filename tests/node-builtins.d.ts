// The node built-ins a test needs to grep the repository, and to hash a delivered picture. The project carries no node types,
// and this is smaller than a dependency: exactly what is used, and nothing else. The same pattern
// as scripts/sprites-manifest.d.mts.

declare module 'node:fs' {
  /** The bytes of a file, when a test wants to read the header of a PNG rather than its text. */
  export interface FileBytes {
    subarray(from: number, to: number): FileBytes;
    readUInt32BE(at: number): number;
    length: number;
  }
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readFileSync(path: string): FileBytes;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean };
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
}

declare module 'node:crypto' {
  /** The one hash a test takes of a delivered picture, to hold it byte for byte to the art side's
   *  own record (CLAUDE.md T30 2.2). */
  export function createHash(algorithm: 'sha256'): {
    update(data: { length: number }): { digest(encoding: 'hex'): string };
  };
}
