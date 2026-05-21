import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Q1 2024 Certificates' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Certificate campaign for Q1 2024', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'template-id-123' })
  @IsUUID()
  templateId: string;
}
