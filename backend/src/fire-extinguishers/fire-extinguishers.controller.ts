import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FireExtinguishersService } from './fire-extinguishers.service';
import { CreateFireExtinguisherDto } from './dto/create-fire-extinguisher.dto';
import { UpdateFireExtinguisherDto } from './dto/update-fire-extinguisher.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('fire-extinguishers')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller('fire-extinguishers')
export class FireExtinguishersController {
  constructor(private readonly fireExtinguishersService: FireExtinguishersService) {}

  @Post()
  create(@Body() dto: CreateFireExtinguisherDto) {
    return this.fireExtinguishersService.create(dto);
  }

  @Get()
  findAll() {
    return this.fireExtinguishersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fireExtinguishersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFireExtinguisherDto) {
    return this.fireExtinguishersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fireExtinguishersService.remove(id);
  }
}
