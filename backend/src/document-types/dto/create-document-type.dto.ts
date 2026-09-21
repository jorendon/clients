import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateDocumentTypeDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, { message: 'validation.invalidCode' })
  @MaxLength(30)
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'validation.nameRequired' })
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
