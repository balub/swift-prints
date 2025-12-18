import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { StlAnalyzerService } from './stl-analyzer.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [UploadsController],
  providers: [UploadsService, StlAnalyzerService],
  exports: [UploadsService],
})
export class UploadsModule {}

