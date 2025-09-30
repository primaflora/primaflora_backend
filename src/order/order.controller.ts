import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, UsePipes, UnauthorizedException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Role } from 'src/common/decorators/role.decorator';
import { EUserRole } from 'src/enum/role.enum';
import { AcceptLanguage } from 'src/common/decorators/accept-language.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TokenService } from 'src/token/token.service';
import { ValidateLanguagePipe } from 'src/common/pipes/accept-language.pipe';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly tokenService: TokenService
  ) {}

    @Get()
    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
    async findAll(@Req() req: Request) {
        const token = req.headers['authorization']?.split(' ')[1];
        console.log("TOKEN", token)
        return this.orderService.getAll();
    }

    @Get('my-history')
    @UsePipes(new ValidateLanguagePipe())
    async getMyOrderHistory(@Req() req: Request, @AcceptLanguage() language: string) {
        // Извлекаем токен из заголовков
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            throw new UnauthorizedException('Токен авторизации не найден');
        }

        const token = authHeader.replace('Bearer ', '');
        
        try {
            // Верифицируем токен и получаем данные пользователя
            const userPayload = await this.tokenService.verifyToken(token, 'access');
            
            // Получаем историю заказов пользователя
            return await this.orderService.getMyOrders(userPayload.uuid, language);
        } catch (error) {
            throw new UnauthorizedException('Недействительный токен авторизации');
        }
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
