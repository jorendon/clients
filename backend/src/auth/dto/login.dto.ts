import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'validation.invalidEmail' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'validation.passwordRequired' })
  password: string;
}
