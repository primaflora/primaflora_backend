import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Role } from 'src/common/decorators/role.decorator';
import { EUserRole } from 'src/enum/role.enum';
import { AcceptLanguage } from 'src/common/decorators/accept-language.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

    @Get()
    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
    async findAll(@Req() req: Request) {
        const token = req.headers['authorization']?.split(' ')[1];
        console.log("TOKEN", token)
        return this.orderService.getAll();
    }
  
  @Post('create')
  async createOrder(@Body() dto: { userId: string }) {
    console.log(dto.userId)
    return this.orderService.createOrder(dto.userId);
  }

  @Post('pay')
  async createPayment(@Body() dto: { orderId: string }) {
    return this.orderService.createPayment(dto.orderId);
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    console.log(payload);
    return this.orderService.handleWebhook(payload);
  }
}
