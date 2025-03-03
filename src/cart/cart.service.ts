import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity } from '../entity/cart.entity';
import { ProductsService } from '../products/products.service';
import { UserService } from '../user/user.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
    constructor(
        @InjectRepository(CartEntity)
        private cartRepository: Repository<CartEntity>,
        private readonly userService: UserService,
        @Inject(forwardRef(() => ProductsService))
        private readonly productService: ProductsService
    ) {}

    async create(newCart: CreateCartDto, userUid: string) {
        // NEW
        const user = await this.userService.findOneById(userUid);
        const product = await this.productService.findOneByUid(newCart.productUId);

        if (!user || !product) {
            throw new NotFoundException("user or product not found");
        }
        
        // Check if the cart item already exists for the user and product
        const existingCartItem = await this.cartRepository
            .createQueryBuilder('cart')
            .where('cart.userId = :userId', { userId: user.id })
            .andWhere('cart.product_id = :productId', { productId: product.id })
            .getOne();

        console.log('ExistingCartItem => ', existingCartItem);

        if (existingCartItem) {
            // Update the quantity if the cart item exists
            existingCartItem.quantity += newCart.quantity;
            return await this.cartRepository.save(existingCartItem);
        } else {
            // Create a new cart item if it does not exist
            return await this.cartRepository.save({
                quantity: newCart.quantity,
                product,
                user,
            });
        }

        // OLD
        // const user = await this.userService.findOneById(userUid);
        // const product = await this.productService.findOneByUid(
        //     newCart.productUId
        // );
        // return this.cartRepository.save({ ...newCart, user, product });
    }

    async findAll(userId: string, language: string) {
        const res = await this.cartRepository
            .createQueryBuilder('cart')
            .leftJoin('cart.user', 'user')
            .leftJoinAndSelect('cart.product', 'product')
            .leftJoin('product.translate', 'product_t')
            .addSelect(["product_t.title", "product_t.language", "product_t.shortDesc"])
            .where('user.uuid = :userId', { userId })
            .andWhere('product_t.language = :language', { language })
            .getMany();

        if (res.length === 0) {
            return [];
        }

        return res.map(cartItem => {
                const { translate, ...other } = cartItem.product;

                return {
                    ...cartItem,
                    product: {
                        ...other,
                        title: translate[0].title,
                        shortDesc: translate[0].shortDesc,
                        language: translate[0].language,
                    }
                }
            })
    }

    async deleteByProductId(productId: number) {
        return await this.cartRepository
            .createQueryBuilder('cart')
            .delete()
            .from(CartEntity)
            .where('cart."product_id" = :productId', { productId })
            .execute();
    }

    async update(userId: string, changes: UpdateCartDto) {
        const cartItem = await this.cartRepository.findOne({
            where: { user: { uuid: userId }, product: { uuid: changes.productUuid } },
        });
        console.log(cartItem);
        if (!cartItem) {
            throw new Error('Товар в корзине не найден');
        }
        cartItem.quantity = changes.quantity;

        return this.cartRepository.save(cartItem);
    }

    async remove(uuid: string) {
        return await this.cartRepository.delete({ uuid });
    }
}
