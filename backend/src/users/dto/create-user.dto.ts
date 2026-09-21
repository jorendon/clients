import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'validation.invalidEmail' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'validation.nameRequired' })
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(6, { message: 'validation.passwordMin' })
  password: string;

  @IsOptional()
  @IsEnum(Role, { message: 'validation.invalidRole' })
  role?: Role;
}
