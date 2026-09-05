import {
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateHabitDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede pasar de 50 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'La descripcion no puede pasar de 200 caracteres',
  })
  description?: string;

  @IsOptional()
  @IsHexColor({ message: 'El color debe ser un hexadecimal valido' })
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
