import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail({}, { message: 'validation.invalidEmail' })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'validation.nameRequired' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'validation.passwordMin' })
  password?: string;
}
