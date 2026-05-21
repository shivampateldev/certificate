import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Technical Certificate' })
  @IsString()
  name: string;

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

  @ApiProperty({ example: 800, required: false })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiProperty({ example: 600, required: false })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty({ example: 300, required: false })
  @IsOptional()
  @IsNumber()
  dpi?: number;
}
