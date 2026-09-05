import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario.decorator';

@UseGuards(JwtAuthGuard)
@Controller('habits/:habitId/records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  marcar(
    @UsuarioActual() userId: string,
    @Param('habitId') habitId: string,
    @Body() dto: CreateRecordDto,
  ) {
    return this.recordsService.marcar(userId, habitId, dto);
  }

  @Get()
  historial(@UsuarioActual() userId: string, @Param('habitId') habitId: string) {
    return this.recordsService.historial(userId, habitId);
  }

  @Delete(':fecha')
  desmarcar(
    @UsuarioActual() userId: string,
    @Param('habitId') habitId: string,
    @Param('fecha') fecha: string,
  ) {
    return this.recordsService.desmarcar(userId, habitId, fecha);
  }
}
