import {
  IsDateString,
  IsHexColor,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const FRECUENCIAS = ['diaria', 'semanal', 'personalizada'];
export const PRIORIDADES = ['alta', 'media', 'baja'];

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
  @IsString()
  @MaxLength(30, { message: 'La categoria no puede pasar de 30 caracteres' })
  category?: string;

  @IsOptional()
  @IsHexColor({ message: 'El color debe ser un hexadecimal valido' })
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsIn(FRECUENCIAS, {
    message: 'La frecuencia debe ser diaria, semanal o personalizada',
  })
  frequency?: string;

  @IsOptional()
  @IsIn(PRIORIDADES, {
    message: 'La prioridad debe ser alta, media o baja',
  })
  priority?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio no es valida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin no es valida' })
  endDate?: string;
}
