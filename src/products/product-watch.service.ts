import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductWatchEntity } from '../entity/product-watch.entity';
import { UserEntity } from '../entity/user.entity';
import { ProductEntity } from '../entity/product.entity';
import { CreateProductWatchDto, ProductWatchResponseDto } from '../dto/product-watch.dto';

@Injectable()
export class ProductWatchService {
    constructor(
        @InjectRepository(ProductWatchEntity)
        private readonly productWatchRepository: Repository<ProductWatchEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
    ) {}

    async addWatch(userUuid: string, dto: CreateProductWatchDto): Promise<ProductWatchResponseDto> {
        // Проверим, существует ли пользователь
        const user = await this.userRepository.findOne({ where: { uuid: userUuid } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Проверим, существует ли товар
        const product = await this.productRepository.findOne({ where: { uuid: dto.productUuid } });
        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // Проверим, не отслеживает ли уже пользователь этот товар
        const existingWatch = await this.productWatchRepository.findOne({
            where: {
                user: { uuid: userUuid },
                product: { uuid: dto.productUuid },
                isActive: true
            }
        });

        if (existingWatch) {
            throw new ConflictException('Product is already being watched by this user');
        }

        // Создаем новое отслеживание
        const watch = this.productWatchRepository.create({
            user,
            product,
            isActive: true
        });

        const savedWatch = await this.productWatchRepository.save(watch);

        return {
            uuid: savedWatch.uuid,
            userUuid: savedWatch.user.uuid,
            productUuid: savedWatch.product.uuid,
            createdAt: savedWatch.createdAt,
            isNotified: savedWatch.isNotified,
            notifiedAt: savedWatch.notifiedAt
        };
    }

    async removeWatch(userUuid: string, productUuid: string): Promise<void> {
        const watch = await this.productWatchRepository.findOne({
            where: {
                user: { uuid: userUuid },
                product: { uuid: productUuid },
                isActive: true
            }
        });

        if (!watch) {
            throw new NotFoundException('Watch not found');
        }

        // Помечаем как неактивный вместо удаления
        watch.isActive = false;
        await this.productWatchRepository.save(watch);
    }

    async getUserWatches(userUuid: string): Promise<ProductWatchResponseDto[]> {
        const watches = await this.productWatchRepository.find({
            where: { 
                user: { uuid: userUuid },
                isActive: true 
            },
            relations: ['user', 'product']
        });

        return watches.map(watch => ({
            uuid: watch.uuid,
            userUuid: watch.user.uuid,
            productUuid: watch.product.uuid,
            createdAt: watch.createdAt,
            isNotified: watch.isNotified,
            notifiedAt: watch.notifiedAt
        }));
    }

    async isWatching(userUuid: string, productUuid: string): Promise<boolean> {
        const watch = await this.productWatchRepository.findOne({
            where: {
                user: { uuid: userUuid },
                product: { uuid: productUuid },
                isActive: true
            }
        });

        return !!watch;
    }

    async notifyWatchers(productUuid: string): Promise<void> {
        // Найти всех пользователей, отслеживающих этот товар
        const watches = await this.productWatchRepository.find({
            where: {
                product: { uuid: productUuid },
                isActive: true,
                notifiedAt: null
            },
            relations: ['user', 'product']
        });

        // Помечаем как уведомленных
        for (const watch of watches) {
            watch.notifiedAt = new Date();
            await this.productWatchRepository.save(watch);
        }

        // Здесь можно добавить логику отправки email/push уведомлений
        // Пока просто логируем
        console.log(`Notified ${watches.length} users about product ${productUuid} availability`);
    }

    async getProductWatchers(productUuid: string): Promise<ProductWatchResponseDto[]> {
        const watches = await this.productWatchRepository.find({
            where: { 
                product: { uuid: productUuid },
                isActive: true
            },
            relations: ['user', 'product']
        });

        return watches.map(watch => ({
            uuid: watch.uuid,
            userUuid: watch.user.uuid,
            productUuid: watch.product.uuid,
            createdAt: watch.createdAt,
            isNotified: watch.isNotified,
            notifiedAt: watch.notifiedAt
        }));
    }

    async getAvailableWatchedProducts(userUuid: string, language: string = 'ukr'): Promise<any[]> {
        const watches = await this.productWatchRepository
            .createQueryBuilder('watch')
            .leftJoinAndSelect('watch.user', 'user')
            .leftJoinAndSelect('watch.product', 'product')
            .leftJoinAndSelect('product.translate', 'product_t')
            .where('user.uuid = :userUuid', { userUuid })
            .andWhere('watch.isActive = :isActive', { isActive: true })
            .andWhere('product.inStock = :inStock', { inStock: true })
            .andWhere('product_t.language = :language', { language })
            .getMany();

        return watches.map(watch => {
            const translate = watch.product.translate.find(t => t.language === language) || watch.product.translate[0];
            return {
                uuid: watch.product.uuid,
                title: translate?.title || 'Product',
                shortDesc: translate?.shortDesc || '',
                photo_url: watch.product.photo_url,
                price_currency: watch.product.price_currency,
                percent_discount: watch.product.percent_discount,
                rating: watch.product.rating,
                inStock: watch.product.inStock,
                isPublished: watch.product.isPublished,
                watchedAt: watch.createdAt,
                notifiedAt: watch.notifiedAt
            };
        });
    }

    async markAsViewed(userUuid: string, productUuid: string): Promise<void> {
        const watch = await this.productWatchRepository.findOne({
            where: {
                user: { uuid: userUuid },
                product: { uuid: productUuid },
                isActive: true
            }
        });

        if (watch) {
            // Помечаем как неактивный (удаляем из отслеживания)
            watch.isActive = false;
            await this.productWatchRepository.save(watch);
        }
    }

    async markAllAsViewed(userUuid: string): Promise<void> {
        const watches = await this.productWatchRepository.find({
            where: {
                user: { uuid: userUuid },
                isActive: true,
                product: { inStock: true }
            }
        });

        // Помечаем все доступные товары как неактивные
        for (const watch of watches) {
            watch.isActive = false;
            await this.productWatchRepository.save(watch);
        }
    }
}