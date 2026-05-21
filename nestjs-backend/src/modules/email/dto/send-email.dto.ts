import { IsEmail, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ example: 'recipient@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'Certificate Delivery' })
  @IsString()
  subject: string;

  @ApiProperty({ example: '<h1>Your Certificate</h1>' })
  @IsString()
  htmlContent: string;

  @ApiProperty({ example: 'Your Certificate', required: false })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  certificateId?: string;
}
