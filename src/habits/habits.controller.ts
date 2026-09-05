import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario.decorator';

@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Post()
  create(@UsuarioActual() userId: string, @Body() dto: CreateHabitDto) {
    return this.habitsService.create(userId, dto);
  }

  @Get()
  findAll(@UsuarioActual() userId: string) {
    return this.habitsService.findAll(userId);
  }

  @Get(':id')
  findOne(@UsuarioActual() userId: string, @Param('id') id: string) {
    return this.habitsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @UsuarioActual() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.habitsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@UsuarioActual() userId: string, @Param('id') id: string) {
    return this.habitsService.remove(userId, id);
  }
}
