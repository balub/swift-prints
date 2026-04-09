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

interface AnalysisAccumulator {
  triangleCount: number;
  overhangCount: number;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  signedVolume: number;
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
  private readonly SUPPORT_OVERHANG_THRESHOLD = Math.cos((45 * Math.PI) / 180);

  /**
   * Analyze an STL file buffer and return geometry metrics
   */
  async analyze(buffer: Buffer): Promise<StlAnalysisResult> {
    const analysis = this.isBinaryStl(buffer)
      ? this.analyzeBinaryStl(buffer)
      : this.analyzeAsciiStl(buffer);
    const boundingBox = this.calculateBoundingBox(analysis);
    const volumeMm3 = Math.abs(analysis.signedVolume);
    const needsSupports = this.detectSupportsNeeded(analysis);

    // Estimate filament usage (assuming 20% infill + walls)
    const effectiveVolume = volumeMm3 * 0.35; // Rough estimate with infill
    const baseFilamentEstimateG = effectiveVolume * this.PLA_DENSITY;

    // Estimate print time
    const basePrintTimeHours =
      (effectiveVolume / this.PRINT_SPEED_MM3_PER_HOUR) *
      this.TIME_OVERHEAD_FACTOR;

    this.logger.log(
      `Analyzed STL: ${analysis.triangleCount} triangles, volume: ${volumeMm3.toFixed(2)}mm³`,
    );

    return {
      volumeMm3: Math.round(volumeMm3 * 100) / 100,
      boundingBox: {
        x: Math.round(boundingBox.x * 100) / 100,
        y: Math.round(boundingBox.y * 100) / 100,
        z: Math.round(boundingBox.z * 100) / 100,
      },
      triangleCount: analysis.triangleCount,
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

  private createAccumulator(): AnalysisAccumulator {
    return {
      triangleCount: 0,
      overhangCount: 0,
      minX: Infinity,
      minY: Infinity,
      minZ: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      maxZ: -Infinity,
      signedVolume: 0,
    };
  }

  private analyzeBinaryStl(buffer: Buffer): AnalysisAccumulator {
    const analysis = this.createAccumulator();
    if (buffer.length < 84) {
      return analysis;
    }

    const triangleCount = buffer.readUInt32LE(80);
    let offset = 84;

    for (let i = 0; i < triangleCount; i++) {
      if (offset + 50 > buffer.length) {
        break;
      }

      this.accumulateTriangle(
        analysis,
        buffer.readFloatLE(offset + 8),
        buffer.readFloatLE(offset + 12),
        buffer.readFloatLE(offset + 16),
        buffer.readFloatLE(offset + 20),
        buffer.readFloatLE(offset + 24),
        buffer.readFloatLE(offset + 28),
        buffer.readFloatLE(offset + 32),
        buffer.readFloatLE(offset + 36),
        buffer.readFloatLE(offset + 40),
        buffer.readFloatLE(offset + 44),
      );

      offset += 50; // 12 floats (48 bytes) + 2 byte attribute
    }

    return analysis;
  }

  private analyzeAsciiStl(buffer: Buffer): AnalysisAccumulator {
    const analysis = this.createAccumulator();
    const content = buffer.toString('utf-8');

    let currentNormalZ = 0;
    let vertexIndex = 0;
    let v0x = 0,
      v0y = 0,
      v0z = 0;
    let v1x = 0,
      v1y = 0,
      v1z = 0;
    let v2x = 0,
      v2y = 0,
      v2z = 0;

    let lineStart = 0;
    for (let i = 0; i <= content.length; i++) {
      if (i !== content.length && content.charCodeAt(i) !== 10) {
        continue;
      }

      const rawLine =
        i > lineStart && content.charCodeAt(i - 1) === 13
          ? content.slice(lineStart, i - 1)
          : content.slice(lineStart, i);
      const line = rawLine.trim().toLowerCase();

      if (line.startsWith('facet normal')) {
        const parts = line.split(/\s+/);
        currentNormalZ = parseFloat(parts[4]) || 0;
        vertexIndex = 0;
      } else if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/);
        const x = parseFloat(parts[1]) || 0;
        const y = parseFloat(parts[2]) || 0;
        const z = parseFloat(parts[3]) || 0;

        if (vertexIndex === 0) {
          v0x = x;
          v0y = y;
          v0z = z;
        } else if (vertexIndex === 1) {
          v1x = x;
          v1y = y;
          v1z = z;
        } else if (vertexIndex === 2) {
          v2x = x;
          v2y = y;
          v2z = z;
        }

        vertexIndex++;
      } else if (line.startsWith('endfacet') && vertexIndex === 3) {
        this.accumulateTriangle(
          analysis,
          currentNormalZ,
          v0x,
          v0y,
          v0z,
          v1x,
          v1y,
          v1z,
          v2x,
          v2y,
          v2z,
        );
        vertexIndex = 0;
      }

      lineStart = i + 1;
    }

    return analysis;
  }

  private accumulateTriangle(
    analysis: AnalysisAccumulator,
    normalZ: number,
    v0x: number,
    v0y: number,
    v0z: number,
    v1x: number,
    v1y: number,
    v1z: number,
    v2x: number,
    v2y: number,
    v2z: number,
  ): void {
    analysis.triangleCount++;

    if (normalZ < -this.SUPPORT_OVERHANG_THRESHOLD) {
      analysis.overhangCount++;
    }

    analysis.minX = Math.min(analysis.minX, v0x, v1x, v2x);
    analysis.minY = Math.min(analysis.minY, v0y, v1y, v2y);
    analysis.minZ = Math.min(analysis.minZ, v0z, v1z, v2z);
    analysis.maxX = Math.max(analysis.maxX, v0x, v1x, v2x);
    analysis.maxY = Math.max(analysis.maxY, v0y, v1y, v2y);
    analysis.maxZ = Math.max(analysis.maxZ, v0z, v1z, v2z);
    analysis.signedVolume +=
      (v0x * (v1y * v2z - v2y * v1z) -
        v1x * (v0y * v2z - v2y * v0z) +
        v2x * (v0y * v1z - v1y * v0z)) /
      6;
  }

  private calculateBoundingBox(analysis: AnalysisAccumulator): {
    x: number;
    y: number;
    z: number;
  } {
    if (analysis.triangleCount === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    return {
      x: analysis.maxX - analysis.minX,
      y: analysis.maxY - analysis.minY,
      z: analysis.maxZ - analysis.minZ,
    };
  }

  private detectSupportsNeeded(analysis: AnalysisAccumulator): boolean {
    if (analysis.triangleCount === 0) {
      return false;
    }

    return analysis.overhangCount / analysis.triangleCount > 0.05;
  }
}
