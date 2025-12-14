import { Injectable, Logger } from '@nestjs/common';

export interface StlAnalysisResult {
  volumeMm3: number;
  boundingBox: {
    x: number;
    y: number;
    z: number;
  };
  triangleCount: number;
  needsSupports: boolean;
  baseFilamentEstimateG: number;
  basePrintTimeHours: number;
}

interface Triangle {
  normal: { x: number; y: number; z: number };
  vertices: Array<{ x: number; y: number; z: number }>;
}

@Injectable()
export class StlAnalyzerService {
  private readonly logger = new Logger(StlAnalyzerService.name);

  // PLA density in g/mm³
  private readonly PLA_DENSITY = 0.00124;
  // Average print speed in mm³/hour (approximate)
  private readonly PRINT_SPEED_MM3_PER_HOUR = 15000;
  // Overhead factor for travel, retraction, etc.
  private readonly TIME_OVERHEAD_FACTOR = 1.3;

  /**
   * Analyze an STL file buffer and return geometry metrics
   */
  async analyze(buffer: Buffer): Promise<StlAnalysisResult> {
    const isBinary = this.isBinaryStl(buffer);

    let triangles: Triangle[];
    if (isBinary) {
      triangles = this.parseBinaryStl(buffer);
    } else {
      triangles = this.parseAsciiStl(buffer.toString('utf-8'));
    }

    const boundingBox = this.calculateBoundingBox(triangles);
    const volumeMm3 = this.calculateVolume(triangles);
    const needsSupports = this.detectSupportsNeeded(triangles);

    // Estimate filament usage (assuming 20% infill + walls)
    const effectiveVolume = volumeMm3 * 0.35; // Rough estimate with infill
    const baseFilamentEstimateG = effectiveVolume * this.PLA_DENSITY;

    // Estimate print time
    const basePrintTimeHours =
      (effectiveVolume / this.PRINT_SPEED_MM3_PER_HOUR) *
      this.TIME_OVERHEAD_FACTOR;

    this.logger.log(
      `Analyzed STL: ${triangles.length} triangles, volume: ${volumeMm3.toFixed(2)}mm³`,
    );

    return {
      volumeMm3: Math.round(volumeMm3 * 100) / 100,
      boundingBox: {
        x: Math.round(boundingBox.x * 100) / 100,
        y: Math.round(boundingBox.y * 100) / 100,
        z: Math.round(boundingBox.z * 100) / 100,
      },
      triangleCount: triangles.length,
      needsSupports,
      baseFilamentEstimateG: Math.round(baseFilamentEstimateG * 100) / 100,
      basePrintTimeHours: Math.round(basePrintTimeHours * 100) / 100,
    };
  }

  private isBinaryStl(buffer: Buffer): boolean {
    // Binary STL starts with 80-byte header, then 4-byte triangle count
    // ASCII STL starts with "solid"
    if (buffer.length < 84) return false;

    const header = buffer.slice(0, 80).toString('utf-8').toLowerCase();
    if (header.startsWith('solid')) {
      // Could be ASCII, check further
      const content = buffer.toString('utf-8', 0, 1000);
      if (content.includes('facet') && content.includes('vertex')) {
        return false;
      }
    }

    // Verify binary format by checking triangle count matches file size
    const triangleCount = buffer.readUInt32LE(80);
    const expectedSize = 84 + triangleCount * 50;
    return buffer.length === expectedSize || buffer.length >= expectedSize - 2;
  }

  private parseBinaryStl(buffer: Buffer): Triangle[] {
    const triangles: Triangle[] = [];
    const triangleCount = buffer.readUInt32LE(80);

    let offset = 84;
    for (let i = 0; i < triangleCount; i++) {
      const normal = {
        x: buffer.readFloatLE(offset),
        y: buffer.readFloatLE(offset + 4),
        z: buffer.readFloatLE(offset + 8),
      };

      const vertices = [
        {
          x: buffer.readFloatLE(offset + 12),
          y: buffer.readFloatLE(offset + 16),
          z: buffer.readFloatLE(offset + 20),
        },
        {
          x: buffer.readFloatLE(offset + 24),
          y: buffer.readFloatLE(offset + 28),
          z: buffer.readFloatLE(offset + 32),
        },
        {
          x: buffer.readFloatLE(offset + 36),
          y: buffer.readFloatLE(offset + 40),
          z: buffer.readFloatLE(offset + 44),
        },
      ];

      triangles.push({ normal, vertices });
      offset += 50; // 12 floats (48 bytes) + 2 byte attribute
    }

    return triangles;
  }

  private parseAsciiStl(content: string): Triangle[] {
    const triangles: Triangle[] = [];
    const lines = content.split('\n').map((l) => l.trim().toLowerCase());

    let currentNormal = { x: 0, y: 0, z: 0 };
    let currentVertices: Array<{ x: number; y: number; z: number }> = [];

    for (const line of lines) {
      if (line.startsWith('facet normal')) {
        const parts = line.split(/\s+/);
        currentNormal = {
          x: parseFloat(parts[2]) || 0,
          y: parseFloat(parts[3]) || 0,
          z: parseFloat(parts[4]) || 0,
        };
        currentVertices = [];
      } else if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/);
        currentVertices.push({
          x: parseFloat(parts[1]) || 0,
          y: parseFloat(parts[2]) || 0,
          z: parseFloat(parts[3]) || 0,
        });
      } else if (line.startsWith('endfacet') && currentVertices.length === 3) {
        triangles.push({
          normal: currentNormal,
          vertices: currentVertices,
        });
      }
    }

    return triangles;
  }

  private calculateBoundingBox(triangles: Triangle[]): {
    x: number;
    y: number;
    z: number;
  } {
    if (triangles.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const triangle of triangles) {
      for (const vertex of triangle.vertices) {
        minX = Math.min(minX, vertex.x);
        minY = Math.min(minY, vertex.y);
        minZ = Math.min(minZ, vertex.z);
        maxX = Math.max(maxX, vertex.x);
        maxY = Math.max(maxY, vertex.y);
        maxZ = Math.max(maxZ, vertex.z);
      }
    }

    return {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ,
    };
  }

  private calculateVolume(triangles: Triangle[]): number {
    // Calculate volume using signed tetrahedron method
    let volume = 0;

    for (const triangle of triangles) {
      const [v0, v1, v2] = triangle.vertices;
      // Volume of tetrahedron from origin to triangle
      volume +=
        (v0.x * (v1.y * v2.z - v2.y * v1.z) -
          v1.x * (v0.y * v2.z - v2.y * v0.z) +
          v2.x * (v0.y * v1.z - v1.y * v0.z)) /
        6;
    }

    return Math.abs(volume);
  }

  private detectSupportsNeeded(triangles: Triangle[]): boolean {
    // Check for overhangs greater than 45 degrees
    const overhangThreshold = Math.cos((45 * Math.PI) / 180);
    let overhangCount = 0;

    for (const triangle of triangles) {
      // Normal pointing downward (negative Z) indicates potential overhang
      if (triangle.normal.z < -overhangThreshold) {
        overhangCount++;
      }
    }

    // If more than 5% of triangles are overhangs, suggest supports
    return overhangCount / triangles.length > 0.05;
  }
}

