import { IsString, IsOptional, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Leading certificate management platform', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'contact@acme.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1-555-0123', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'https://acme.com', required: false })
  @IsOptional()
  @IsUrl()
  website?: string;
}
