import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from 'src/entity/order.entity';
import { OrderItemEntity } from 'src/entity/orderItem.entity';
import { CartEntity } from 'src/entity/cart.entity';
import { ProductEntity } from 'src/entity/product.entity';
import { UserEntity } from 'src/entity/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, CartEntity, ProductEntity, UserEntity])],
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule {}
