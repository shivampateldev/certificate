import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTemplateDto {
  @ApiProperty({ example: 'Technical Certificate', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Certificate for technical workshops', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['Technical', 'Workshop'], required: false })
  @IsOptional()
  @IsArray()
  categories?: string[];

  @ApiProperty({ example: ['certificate', 'technical'], required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  fields?: Record<string, any>[];

  @ApiProperty({ example: 'PUBLISHED', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
