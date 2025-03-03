import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

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
