import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface SliceOptions {
  layerHeight: number;
  infill: number;
  supports: 'none' | 'auto' | 'everywhere';
}

export interface SliceResult {
  gcodeBuffer: Buffer;
  filamentUsedGrams: number;
  printTimeHours: number;
}

@Injectable()
export class SlicingService {
  private readonly logger = new Logger(SlicingService.name);
  private readonly jobsPath: string;
  private readonly configPath: string;
  private readonly slicerContainer: string;
  private readonly useDocker: boolean;

  constructor(private configService: ConfigService) {
    this.jobsPath = this.configService.get<string>(
      'SLICER_JOBS_PATH',
      '/tmp/slicer_jobs',
    );
    this.configPath = this.configService.get<string>(
      'SLICER_CONFIG_PATH',
      '/config',
    );
    this.slicerContainer = this.configService.get<string>(
      'SLICER_CONTAINER',
      'swiftprints-slicer',
    );
    this.useDocker = this.configService.get<string>('NODE_ENV') !== 'test';

    this.logger.log(`Slicer jobs path: ${this.jobsPath}`);
  }

  /**
   * Slice an STL file using PrusaSlicer
   */
  async slice(stlBuffer: Buffer, options: SliceOptions): Promise<SliceResult> {
    const jobId = uuidv4();
    const jobDir = path.join(this.jobsPath, jobId);
    const stlPath = path.join(jobDir, 'input.stl');
    const gcodePath = path.join(jobDir, 'output.gcode');

    try {
      // Create job directory
      await fs.mkdir(jobDir, { recursive: true });

      // Write STL file
      await fs.writeFile(stlPath, stlBuffer);

      this.logger.log(`Starting slice job: ${jobId}`);

      // Build slicer command
      const args = this.buildSlicerArgs(stlPath, gcodePath, options);

      // Run PrusaSlicer
      await this.runSlicer(args, jobDir);

      // Read G-code file
      const gcodeBuffer = await fs.readFile(gcodePath);

      // Parse G-code for metadata
      const metadata = this.parseGcodeMetadata(gcodeBuffer.toString('utf-8'));

      this.logger.log(
        `Slice job complete: ${jobId} - ${metadata.filamentUsedGrams}g, ${metadata.printTimeHours}h`,
      );

      return {
        gcodeBuffer,
        filamentUsedGrams: metadata.filamentUsedGrams,
        printTimeHours: metadata.printTimeHours,
      };
    } finally {
      // Cleanup job directory
      try {
        await fs.rm(jobDir, { recursive: true, force: true });
      } catch (e) {
        this.logger.warn(`Failed to cleanup job directory: ${jobDir}`);
      }
    }
  }

  private buildSlicerArgs(
    stlPath: string,
    gcodePath: string,
    options: SliceOptions,
  ): string[] {
    const args = [
      '--export-gcode',
      '--output',
      gcodePath,
      '--layer-height',
      options.layerHeight.toString(),
      '--fill-density',
      `${options.infill}%`,
    ];

    // Support settings
    switch (options.supports) {
      case 'none':
        args.push('--support-material', '0');
        break;
      case 'auto':
        args.push('--support-material', '1');
        args.push('--support-material-auto', '1');
        break;
      case 'everywhere':
        args.push('--support-material', '1');
        args.push('--support-material-auto', '0');
        break;
    }

    // Add config file
    args.push('--load', path.join(this.configPath, 'config_pla.ini'));

    // Input file
    args.push(stlPath);

    return args;
  }

  private async runSlicer(args: string[], workDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      let cmdArgs: string[];

      if (this.useDocker) {
        // Run via docker exec
        cmd = 'docker';
        cmdArgs = ['exec', this.slicerContainer, 'prusa-slicer', ...args];
      } else {
        // Direct execution (for testing)
        cmd = 'prusa-slicer';
        cmdArgs = args;
      }

      this.logger.debug(`Running: ${cmd} ${cmdArgs.join(' ')}`);

      const process = spawn(cmd, cmdArgs, {
        cwd: workDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          this.logger.error(`Slicer failed with code ${code}: ${stderr}`);
          reject(
            new BadRequestException(
              `Slicing failed: ${stderr || 'Unknown error'}`,
            ),
          );
        }
      });

      process.on('error', (err) => {
        this.logger.error(`Slicer process error: ${err.message}`);
        reject(new BadRequestException(`Slicing failed: ${err.message}`));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        process.kill();
        reject(new BadRequestException('Slicing timed out'));
      }, 5 * 60 * 1000);
    });
  }

  private parseGcodeMetadata(gcode: string): {
    filamentUsedGrams: number;
    printTimeHours: number;
  } {
    let filamentUsedMm = 0;
    let printTimeSeconds = 0;

    // Parse PrusaSlicer G-code comments
    const lines = gcode.split('\n');
    for (const line of lines) {
      // Filament used in mm
      const filamentMatch = line.match(
        /;\s*filament used \[mm\]\s*=\s*([\d.]+)/i,
      );
      if (filamentMatch) {
        filamentUsedMm = parseFloat(filamentMatch[1]);
      }

      // Filament used in grams (preferred)
      const filamentGMatch = line.match(
        /;\s*filament used \[g\]\s*=\s*([\d.]+)/i,
      );
      if (filamentGMatch) {
        return {
          filamentUsedGrams: parseFloat(filamentGMatch[1]),
          printTimeHours: printTimeSeconds / 3600,
        };
      }

      // Estimated print time
      const timeMatch = line.match(
        /;\s*estimated printing time.*=\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i,
      );
      if (timeMatch) {
        const days = parseInt(timeMatch[1] || '0');
        const hours = parseInt(timeMatch[2] || '0');
        const minutes = parseInt(timeMatch[3] || '0');
        const seconds = parseInt(timeMatch[4] || '0');
        printTimeSeconds =
          days * 86400 + hours * 3600 + minutes * 60 + seconds;
      }
    }

    // Convert mm to grams (1.75mm filament, PLA density 1.24 g/cm³)
    const filamentDiameter = 1.75;
    const plaDensity = 1.24;
    const radiusCm = filamentDiameter / 20; // mm to cm / 2
    const lengthCm = filamentUsedMm / 10;
    const volumeCm3 = Math.PI * radiusCm * radiusCm * lengthCm;
    const filamentUsedGrams = volumeCm3 * plaDensity;

    return {
      filamentUsedGrams: Math.round(filamentUsedGrams * 100) / 100,
      printTimeHours: Math.round((printTimeSeconds / 3600) * 100) / 100,
    };
  }
}

