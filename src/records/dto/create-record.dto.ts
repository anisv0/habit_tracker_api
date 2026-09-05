import { IsOptional, Matches } from 'class-validator';

export class CreateRecordDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener el formato AAAA-MM-DD',
  })
  date?: string;
}
