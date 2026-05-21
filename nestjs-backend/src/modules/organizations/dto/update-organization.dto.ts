import { IsOptional, IsString, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'Acme Corporation', required: false })
  @IsOptional()
  @IsString()
  name?: string;

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

  @ApiProperty({ example: '123 Main St', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'San Francisco', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'CA', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'United States', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: '94105', required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;
}
