import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'Upload ID from /uploads/analyze', format: 'uuid' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'Printer ID', format: 'uuid' })
  @IsString()
  printerId: string;

  @ApiProperty({ description: 'Filament ID', format: 'uuid' })
  @IsString()
  filamentId: string;

  @ApiProperty({ description: 'Team number', example: 'Team-42' })
  @IsString()
  teamNumber: string;

  @ApiProperty({ description: 'Participant name', example: 'John Doe' })
  @IsString()
  participantName: string;

  @ApiProperty({ description: 'Participant email', format: 'email', example: 'john@example.com' })
  @IsEmail()
  participantEmail: string;
}
