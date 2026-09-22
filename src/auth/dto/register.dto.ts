import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsEmail({}, { message: 'El correo no es valido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
  @Matches(/[A-Z]/, {
    message: 'La contrasena debe tener al menos una letra mayuscula',
  })
  @Matches(/[a-z]/, {
    message: 'La contrasena debe tener al menos una letra minuscula',
  })
  @Matches(/[0-9]/, {
    message: 'La contrasena debe tener al menos un numero',
  })
  password: string;
}
