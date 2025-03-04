import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderEntity, OrderStatus } from 'src/entity/order.entity';
import { Repository } from 'typeorm';
import { OrderItemEntity } from 'src/entity/orderItem.entity';
import { CartEntity } from 'src/entity/cart.entity';
import { ProductEntity } from 'src/entity/product.entity';
import { UserEntity } from 'src/entity/user.entity';
import axios from 'axios';
import { errorMonitor } from 'events';

@Injectable()
export class OrderService {
    private readonly monobankApiUrl = 'https://api.monobank.ua/api/merchant/invoice/create';
    private readonly monobankSecret = 'uMxoYrjOHw2UKFE5L89xY1vmTnjhZFXHzNYPKzgV7YNc';

    constructor(
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderItemEntity)
        private readonly orderItemRepository: Repository<OrderItemEntity>,
        @InjectRepository(CartEntity)
        private readonly cartRepository: Repository<CartEntity>,
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) {}
    async getAll() {
        return await this.orderRepository.find({
            relations: ['user', 'items', 'items.product', 'items.product.translate'],
            order: { createdAt: 'DESC' },
        })
    }
    // Оформление заказа из корзины
    async createOrder(userId: string) {
        const user = await this.userRepository.findOne({ where: { uuid: userId } });
        console.log(user);
        if (!user) {
            throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
        }

        // Получаем все товары в корзине
        const cartItems = await this.cartRepository.find({
            where: { user: { uuid: userId } },
            relations: ['product'],
        });
        console.log(cartItems)

        if (cartItems.length === 0) {
            throw new HttpException('Корзина пуста', HttpStatus.BAD_REQUEST);
        }

        // Рассчитываем общую сумму заказа
        const totalPrice = cartItems.reduce((sum, item) => sum + item.product.price_currency * item.quantity, 0);

        // Создаём новый заказ
        const order = this.orderRepository.create({
            user,
            totalPrice,
            status: OrderStatus.PENDING,
            items: [],
        });

        console.log(order);

        await this.orderRepository.save(order);

        // Создаём элементы заказа
        for (const cartItem of cartItems) {
            const orderItem = this.orderItemRepository.create({
                order,
                product: cartItem.product,
                quantity: cartItem.quantity,
                price: cartItem.product.price_currency,
            });

            console.log(orderItem);

            await this.orderItemRepository.save(orderItem);
            console.log("HERE1")
            order.items.push(orderItem);
        }
        console.log("HERE2")
        // const cartItemsToRemove = await this.cartRepository.find({
        //     where: { user: { uuid: userId } }, // Загружаем все товары в корзине пользователя
        //     relations: ['user'],
        // });
        
        if (cartItems.length > 0) {
            await this.cartRepository.remove(cartItems);
        }
        // Очищаем корзину после оформления заказа
        // await this.cartRepository.delete({ user: { uuid: userId } });

        return order;
    }

    async createPayment(orderId: string) {
        const order = await this.orderRepository.findOne({
            where: { uuid: orderId },
            relations: ['user', 'items', 'items.product', 'items.product.translate'],
        });

        if (!order) {
            throw new HttpException('Заказ не найден', HttpStatus.NOT_FOUND);
        }

        if (order.status !== OrderStatus.PENDING) {
            throw new HttpException('Заказ уже оплачен или отменён', HttpStatus.BAD_REQUEST);
        }
        console.log(order.items[0].product)
        const invoicePayload = order.items.map((item) => ({
            name: item.product.translate[0].title,
            qty: item.quantity,
            sum: item.price * 100, // Конвертируем в копейки
            icon: item.product.photo_url,
            unit: 'шт.',
            code: item.product.uuid,
        }));

        // const body = {
        //     amount: Math.round(order.totalPrice * 100), // сумма в копейках
        //     ccy: 980, // гривна
        //     merchantPaymInfo: {
        //         reference: order.id,
        //         destination: `Оплата заказа #${order.id}`,
        //     },
        //     redirectUrl: `http://localhost:3000/success`,
        //     webHookUrl: `http://localhost:3000/api/orders/webhook`,
        //     validity: new Date(Date.now() + 3600 * 1000).toISOString(),
        // };

        try {

            const response = await axios.post(
                this.monobankApiUrl,
                {
                    amount: Math.round(order.totalPrice * 100),
                    ccy: 980,
                    destination: `Оплата заказа #${order.id}`,
                    comment: 'Оплата товаров',
                    basketOrder: invoicePayload,
                    redirectUrl: `https://primaflora-web-2759862b88c2.herokuapp.com/checkout/success`,
                    webHookUrl: `https://primaflora-12d77550da26.herokuapp.com/orders/webhook`,
                    reference: order.uuid,
                },
                {
                    headers: {
                        'X-Token': this.monobankSecret,
                    },
                },
            );

            order.invoiceId = response.data.invoiceId;
            await this.orderRepository.save(order);

            return { orderId: order.uuid, paymentUrl: response.data.pageUrl };
        } catch (error) {
            console.log(error);
            throw new HttpException(
                error.response?.data || 'Ошибка создания платежа',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async handleWebhook(payload: any) {
        const { invoiceId, status } = payload;
        console.log("WEBHOOK", payload)
        const order = await this.orderRepository.findOne({ where: { invoiceId } });
        console.log(order)
        if (!order) {
            throw new HttpException('Заказ не найден', HttpStatus.NOT_FOUND);
        }
    
        if (status === 'success') {
            order.status = OrderStatus.PAID;
        } else if (status === 'failure') {
            order.status = OrderStatus.CANCELED;
        }
    
        await this.orderRepository.save(order);
        return { success: true };
    }
}
