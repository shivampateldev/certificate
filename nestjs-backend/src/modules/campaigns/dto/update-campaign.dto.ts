import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCampaignDto {
  @ApiProperty({ example: 'Q1 2024 Certificates', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Certificate campaign for Q1 2024', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'IN_PROGRESS',
    enum: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}
