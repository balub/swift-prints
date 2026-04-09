export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  normal: Vec3;
  vertices: [Vec3, Vec3, Vec3];
}

export interface ParsedStl {
  triangles: Triangle[];
  volumeMm3: number;
  surfaceAreaMm2: number;
  boundingBox: Vec3;
  needsSupports: boolean;
}

export function parseStl(buffer: ArrayBuffer): ParsedStl {
  const bytes = new Uint8Array(buffer);
  const isBinary = detectBinary(bytes, buffer);
  const triangles = isBinary
    ? parseBinary(buffer)
    : parseAscii(new TextDecoder().decode(bytes));

  return {
    triangles,
    volumeMm3: Math.abs(calculateVolume(triangles)),
    surfaceAreaMm2: calculateSurfaceArea(triangles),
    boundingBox: calculateBoundingBox(triangles),
    needsSupports: detectSupports(triangles),
  };
}

function detectBinary(bytes: Uint8Array, buffer: ArrayBuffer): boolean {
  if (bytes.length < 84) return false;
  const header = new TextDecoder().decode(bytes.slice(0, 80)).toLowerCase();
  if (header.startsWith('solid')) {
    const preview = new TextDecoder().decode(bytes.slice(0, 1000));
    if (preview.includes('facet') && preview.includes('vertex')) return false;
  }
  const triangleCount = new DataView(buffer).getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;
  return bytes.length >= expectedSize - 2;
}

function parseBinary(buffer: ArrayBuffer): Triangle[] {
  const view = new DataView(buffer);
  const count = view.getUint32(80, true);
  const triangles: Triangle[] = [];
  let offset = 84;
  for (let i = 0; i < count; i++) {
    triangles.push({
      normal: { x: view.getFloat32(offset, true), y: view.getFloat32(offset + 4, true), z: view.getFloat32(offset + 8, true) },
      vertices: [
        { x: view.getFloat32(offset + 12, true), y: view.getFloat32(offset + 16, true), z: view.getFloat32(offset + 20, true) },
        { x: view.getFloat32(offset + 24, true), y: view.getFloat32(offset + 28, true), z: view.getFloat32(offset + 32, true) },
        { x: view.getFloat32(offset + 36, true), y: view.getFloat32(offset + 40, true), z: view.getFloat32(offset + 44, true) },
      ],
    });
    offset += 50;
  }
  return triangles;
}

function parseAscii(content: string): Triangle[] {
  const triangles: Triangle[] = [];
  const lines = content.split('\n').map((l) => l.trim().toLowerCase());
  let normal: Vec3 = { x: 0, y: 0, z: 0 };
  let verts: Vec3[] = [];

  for (const line of lines) {
    if (line.startsWith('facet normal')) {
      const p = line.split(/\s+/);
      normal = { x: +p[2] || 0, y: +p[3] || 0, z: +p[4] || 0 };
      verts = [];
    } else if (line.startsWith('vertex')) {
      const p = line.split(/\s+/);
      verts.push({ x: +p[1] || 0, y: +p[2] || 0, z: +p[3] || 0 });
    } else if (line.startsWith('endfacet') && verts.length === 3) {
      triangles.push({ normal, vertices: [verts[0], verts[1], verts[2]] });
    }
  }
  return triangles;
}

function calculateVolume(triangles: Triangle[]): number {
  let volume = 0;
  for (const { vertices: [v0, v1, v2] } of triangles) {
    volume +=
      (v0.x * (v1.y * v2.z - v2.y * v1.z) -
        v1.x * (v0.y * v2.z - v2.y * v0.z) +
        v2.x * (v0.y * v1.z - v1.y * v0.z)) / 6;
  }
  return volume;
}

function calculateSurfaceArea(triangles: Triangle[]): number {
  let area = 0;
  for (const { vertices: [v0, v1, v2] } of triangles) {
    const abx = v1.x - v0.x, aby = v1.y - v0.y, abz = v1.z - v0.z;
    const acx = v2.x - v0.x, acy = v2.y - v0.y, acz = v2.z - v0.z;
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    area += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }
  return area;
}

function calculateBoundingBox(triangles: Triangle[]): Vec3 {
  if (triangles.length === 0) return { x: 0, y: 0, z: 0 };
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const { vertices } of triangles) {
    for (const v of vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
      if (v.z > maxZ) maxZ = v.z;
    }
  }
  return { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
}

function detectSupports(triangles: Triangle[]): boolean {
  if (triangles.length === 0) return false;
  const threshold = Math.cos((45 * Math.PI) / 180);
  const overhangs = triangles.filter((t) => t.normal.z < -threshold).length;
  return overhangs / triangles.length > 0.05;
}
