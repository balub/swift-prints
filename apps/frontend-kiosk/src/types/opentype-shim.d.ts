// opentype.js 2.x ships without resolvable type declarations.
// Minimal surface used by the name-sign block.
declare module "opentype.js" {
  export interface OpenTypePathCommand {
    type: string;
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }

  export interface OpenTypePath {
    commands: OpenTypePathCommand[];
  }

  export interface Font {
    unitsPerEm: number;
    getPath(text: string, x: number, y: number, fontSize: number): OpenTypePath;
    getPaths(text: string, x: number, y: number, fontSize: number): OpenTypePath[];
  }

  export function parse(buffer: ArrayBuffer): Font;
}
