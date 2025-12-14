import { IsString, IsEmail } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  uploadId: string;

  @IsString()
  printerId: string;

  @IsString()
  filamentId: string;

  @IsString()
  teamNumber: string;

  @IsString()
  participantName: string;

  @IsEmail()
  participantEmail: string;
}
