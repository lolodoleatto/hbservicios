import { Body, Controller, Get, Param, ParseIntPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrdersPdfService } from './orders-pdf.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersPdfService: OrdersPdfService,
  ) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const order = await this.ordersService.findOne(id);
    const doc = this.ordersPdfService.buildRemito(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="remito-${order.orderNumber}.pdf"`,
    );
    doc.pipe(res);
    doc.end();
  }
}
