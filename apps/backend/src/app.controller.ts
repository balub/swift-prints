import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('ping')
  @ApiOperation({
    summary: 'Ping',
    description: 'Simple ping endpoint to check if the server is reachable',
  })
  @ApiResponse({ status: 200, description: 'pong' })
  ping() {
    return 'pong';
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check if the API is running with detailed status',
  })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
