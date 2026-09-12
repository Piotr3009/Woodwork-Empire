// Types for the build script, so a test can call it without pulling node types into the project.

export declare const SPRITE_DIR: string;
export declare const MANIFEST_NAME: string;
export declare function pickPngs(names: readonly string[]): string[];
export declare function spriteFilesIn(directory: string): string[];
export declare function writeManifest(directory: string): string[];
