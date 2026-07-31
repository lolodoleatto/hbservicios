import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContainerLoanDto } from './dto/create-container-loan.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('clients')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Si es "true", incluye también los clientes dados de baja.',
  })
  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.clientsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.deactivate(id);
  }

  @Post(':id/loans')
  createLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateContainerLoanDto,
  ) {
    return this.clientsService.createLoan(id, dto);
  }

  @ApiQuery({
    name: 'includeReturned',
    required: false,
    type: Boolean,
    description: 'Si es "true", incluye también los préstamos ya devueltos.',
  })
  @Get(':id/loans')
  findLoans(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeReturned') includeReturned?: string,
  ) {
    return this.clientsService.findLoans(id, includeReturned === 'true');
  }

  @Patch(':id/loans/:loanId/return')
  returnLoan(
    @Param('id', ParseIntPipe) id: number,
    @Param('loanId', ParseIntPipe) loanId: number,
  ) {
    return this.clientsService.returnLoan(id, loanId);
  }
}
