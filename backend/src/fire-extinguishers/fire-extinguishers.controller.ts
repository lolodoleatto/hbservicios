import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FireExtinguishersService } from './fire-extinguishers.service';
import { FireExtinguishersPdfService } from './fire-extinguishers-pdf.service';
import { CreateFireExtinguisherDto } from './dto/create-fire-extinguisher.dto';
import { UpdateFireExtinguisherDto } from './dto/update-fire-extinguisher.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('fire-extinguishers')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller('fire-extinguishers')
export class FireExtinguishersController {
  constructor(
    private readonly fireExtinguishersService: FireExtinguishersService,
    private readonly fireExtinguishersPdfService: FireExtinguishersPdfService,
  ) {}

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

  @Get(':id/pdf')
  async downloadPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const fe = await this.fireExtinguishersService.findOne(id);
    const doc = this.fireExtinguishersPdfService.buildComprobante(fe);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="recarga-' + fe.id + '.pdf"');
    doc.pipe(res);
    doc.end();
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
