import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentEntity } from 'src/entity/comment.entity';
import { TokenService } from 'src/token/token.service';
import { LikeService } from 'src/like/like.service';
import { Repository } from 'typeorm';
import { ProductEntity } from '../entity/product.entity';
import { CreateCommentDto } from './dto/create-comment';
import { CategoriesService } from 'src/categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductTranslateEntity } from 'src/entity/product_t.entity';
import { CartService } from 'src/cart/cart.service';
import { Xitem } from 'src/entities_from_db/entities/xitem.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import { OrderService } from 'src/order/order.service';
import { UserEntity } from 'src/entity/user.entity';
import { SubcategoryEntity } from 'src/entity/subcategory.entity';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(ProductEntity)
        private productRepository: Repository<ProductEntity>,

        @InjectRepository(ProductTranslateEntity)
        private productTranslateRepository: Repository<ProductTranslateEntity>,

        @InjectRepository(CommentEntity)
        private commentRepository: Repository<CommentEntity>,

        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,

        @InjectRepository(SubcategoryEntity)
        private subcategoryRepository: Repository<SubcategoryEntity>,

        private readonly likeService: LikeService,

        private readonly tokenService: TokenService,

        private readonly categoryService: CategoriesService,

        @Inject(forwardRef(() => CartService))
        private readonly cartService: CartService,

        @Inject(forwardRef(() => OrderService))
        private readonly orderService: OrderService,
    ) {}

    public async createComment(
        newComment: CreateCommentDto,
        token: string,
        productUuid: string
    ) {
        const userPayload = await this.tokenService.verifyToken(
            token,
            'access'
        );
        if (!userPayload.id) {
            throw new UnauthorizedException();
        }

        // Находим продукт по UUID
        const product = await this.productRepository.findOne({
            where: { uuid: productUuid }
        });

        if (!product) {
            throw new NotFoundException('Товар не найден');
        }

        // Проверяем, купил ли пользователь этот товар
        const hasPurchased = await this.orderService.hasUserPurchasedProduct(
            userPayload.uuid, 
            productUuid
        );

        if (!hasPurchased) {
            throw new ForbiddenException('Вы можете оставлять отзывы только на товары, которые приобрели');
        }

        // Проверяем, не оставлял ли пользователь уже отзыв на этот товар
        const existingComment = await this.commentRepository.findOne({
            where: {
                user: { id: userPayload.id },
                product: { id: product.id }
            }
        });

        if (existingComment) {
            throw new ForbiddenException('Вы уже оставили отзыв на этот товар');
        }

        // Сохраняем новый комментарий
        const savedComment = await this.commentRepository.save({
            text: newComment.text,
            rating: newComment.rating,
            user: { id: userPayload.id },
            product: { id: product.id },
        });

        return savedComment;
    }

    // Метод для подсчета и обновления среднего рейтинга продукта
    // Метод для динамического подсчета среднего рейтинга продукта
    public async calculateProductRating(productId: number): Promise<number> {
        console.log(`[CALCULATE RATING] Calculating rating for product ID: ${productId}`);
        
        // Получаем все комментарии для этого продукта
        const comments = await this.commentRepository.find({
            where: { product: { id: productId } }
        });

        console.log(`[CALCULATE RATING] Found ${comments.length} comments for product ${productId}`);
        
        if (comments.length === 0) {
            console.log(`[CALCULATE RATING] No comments found, returning rating 0`);
            return 0;
        }

        // Считаем средний рейтинг
        const ratings = comments.map(c => c.rating);
        const totalRating = comments.reduce((sum, comment) => sum + comment.rating, 0);
        const averageRating = Math.round((totalRating / comments.length) * 10) / 10; // Округляем до 1 знака после запятой

        console.log(`[CALCULATE RATING] Ratings: [${ratings.join(', ')}]`);
        console.log(`[CALCULATE RATING] Total: ${totalRating}, Count: ${comments.length}, Average: ${averageRating}`);

        return averageRating;
    }

    // Метод для получения количества комментариев для продукта
    public async getProductCommentsCount(productId: number): Promise<number> {
        return await this.commentRepository.count({
            where: { product: { id: productId } }
        });
    }

    // Проверка, может ли пользователь оставить комментарий на товар
    public async canUserCommentProduct(userUuid: string | null, productUuid: string): Promise<boolean> {
        if (!userUuid) {
            return false; // Неавторизованный пользователь не может комментировать
        }

        try {
            // Проверяем, купил ли пользователь товар
            const hasPurchased = await this.orderService.hasUserPurchasedProduct(userUuid, productUuid);
            
            if (!hasPurchased) {
                return false; // Не покупал товар
            }

            // Находим пользователя и продукт для проверки существующего комментария
            const user = await this.userRepository.findOne({
                where: { uuid: userUuid }
            });

            const product = await this.productRepository.findOne({
                where: { uuid: productUuid }
            });

            if (!user || !product) {
                return false;
            }

            // Проверяем, не оставлял ли уже комментарий
            const existingComment = await this.commentRepository.findOne({
                where: {
                    user: { id: user.id },
                    product: { id: product.id }
                }
            });

            return !existingComment; // Можно комментировать, если комментария еще нет
        } catch (error) {
            console.error('Error checking if user can comment:', error);
            return false;
        }
    }

    // Улучшенная версия - проверка с userId
    public async canUserCommentProductById(userId: number | null, productUuid: string): Promise<boolean> {
        if (!userId) {
            return false;
        }

        try {
            // Находим пользователя по ID для получения его UUID
            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                return false;
            }

            return await this.canUserCommentProduct(user.uuid, productUuid);
        } catch (error) {
            console.error('Error checking if user can comment by ID:', error);
            return false;
        }
    }

    // Получение рандомных товаров по подкатегориям с учетом их порядка
    public async getRandomProductsBySubcategories(language: string = 'ukr', token?: string) {
        let isAdmin = false;
        let userPayload = null;

        // Проверка токена и роли пользователя
        if (token) {
            try {
                userPayload = await this.tokenService.verifyToken(token, 'access');
                isAdmin = userPayload.role.name === 'admin';
            } catch (error) {
                console.warn('Token verification failed. Assuming user is not admin.');
            }
        }

        // Получаем все подкатегории, отсортированные по порядку их родительских категорий, а затем по их собственному порядку
        const allSubcategories = await this.subcategoryRepository
            .createQueryBuilder('subcategory')
            .leftJoinAndSelect('subcategory.parent', 'parent')
            .leftJoin('subcategory.translate', 'subcategory_t')
            .addSelect(['subcategory_t.name', 'subcategory_t.language'])
            .where('subcategory_t.language = :language', { language })
            .orderBy('parent.order', 'ASC')
            .addOrderBy('subcategory.order', 'ASC')
            .getMany();

        // Перемешиваем подкатегории и берем случайные 10
        const shuffledSubcategories = allSubcategories.sort(() => Math.random() - 0.5);
        const subcategories = shuffledSubcategories.slice(0, 10);

        const result = [];

        for (const subcategory of subcategories) {
            // Строим запрос для получения товаров подкатегории
            const query = this.productRepository
                .createQueryBuilder('product')
                .leftJoin('product.categories', 'categories')
                .leftJoin('product.translate', 'product_t')
                .addSelect([
                    'product_t.title',
                    'product_t.shortDesc',
                    'product_t.language'
                ])
                .where('categories.id = :subcategoryId', { subcategoryId: subcategory.id })
                .andWhere('product_t.language = :language', { language });

            // Добавляем условие isPublished, если пользователь не админ
            if (!isAdmin) {
                query.andWhere('product.isPublished = :isPublished', { isPublished: true });
            }

            // Получаем все товары подкатегории
            const allProducts = await query.getMany();

            // Перемешиваем товары и берем максимум 8
            const shuffledProducts = allProducts.sort(() => Math.random() - 0.5);
            const randomProducts = shuffledProducts.slice(0, 8);

            // Форматируем товары для возврата
            const formattedProducts = await Promise.all(randomProducts.map(async product => {
                // Получаем информацию о лайке для авторизованного пользователя
                let like = null;
                if (userPayload) {
                    // Ищем лайк пользователя для данного товара
                    like = await this.likeService.findOne(userPayload.id, product.id);
                }

                return {
                    id: product.id,
                    uuid: product.uuid,
                    photo_url: product.photo_url,
                    price_currency: product.price_currency,
                    price_points: product.price_points,
                    percent_discount: product.percent_discount,
                    rating: await this.calculateProductRating(product.id),
                    commentsCount: await this.getProductCommentsCount(product.id),
                    title: product.translate?.[0]?.title || 'Без названия',
                    shortDesc: product.translate?.[0]?.shortDesc || '',
                    isPublished: product.isPublished,
                    inStock: product.inStock,
                    // Добавляем информацию о лайке
                    like: like ? { id: like.id, uuid: like.uuid } : null,
                    // Добавляем информацию о категории для правильного отображения лейблов
                    categories: [{
                        id: subcategory.id,
                        uuid: subcategory.uuid,
                        label: subcategory.label,
                        labelColor: subcategory.labelColor,
                        translate: subcategory.translate
                    }]
                };
            }));

            // Добавляем подкатегорию с её товарами в результат
            if (formattedProducts.length > 0) {
                result.push({
                    subcategory: {
                        id: subcategory.id,
                        uuid: subcategory.uuid,
                        name: subcategory.translate?.[0]?.name || 'Без названия',
                        image: subcategory.image,
                        order: subcategory.order,
                        parentOrder: subcategory.parent?.order || 0,
                        label: subcategory.label,
                        labelColor: subcategory.labelColor
                    },
                    products: formattedProducts
                });
            }
        }

        return result;
    }

    public async getPaginated(pagination: number, token?: string){
        let isAdmin = false;

        // Проверка токена и роли пользователя
        if (token) {
            try {
                const userPayload = await this.tokenService.verifyToken(token, 'access');
                isAdmin = userPayload.role.name === 'admin'; // Проверка роли пользователя
            } catch (error) {
                console.warn('Token verification failed. Assuming user is not admin.');
            }
        }

        const query = this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.categories', 'categories')
            .leftJoin('categories.translate', 'category_t')
            .addSelect(['category_t.name', 'category_t.language', 'categories.label', 'categories.labelColor'])
            .leftJoin('product.translate', 'product_t')
            .addSelect([
                'product_t.title',
                'product_t.language',
                'product_t.shortDesc',
            ])
            .where('product_t.language = :language', { language: 'ukr' })
            .andWhere('category_t.language = :language', { language: 'ukr' });

        // Добавляем условие isPublished, если пользователь не админ
        if (!isAdmin) {
            query.andWhere('product.isPublished = :isPublished', { isPublished: true });
        }

        const res = await query.getMany();


        if (!token) {
            return await Promise.all(res.map(async product => ({
                id: product.id,
                uuid: product.uuid,
                price_currency: product.price_currency,
                shortDesc: product.translate[0]?.shortDesc,
                title: product.translate[0]?.title,
                photo_url: product.photo_url,
                price_points: product.price_points,
                percent_discount: product.percent_discount,
                rating: await this.calculateProductRating(product.id),
                commentsCount: await this.getProductCommentsCount(product.id),
                categories: product.categories.map(cat => ({
                    id: cat.id,
                    uuid: cat.uuid,
                    label: cat.label,
                    labelColor: cat.labelColor,
                    translate: [{
                        name: cat.translate[0]?.name,
                        language: cat.translate[0]?.language,
                    }]
                })),
                inStock: product.inStock
            })));
        }
    
        // Если пользователь авторизован, добавляем информацию о лайках
        let userPayload;
        try {
            userPayload = await this.tokenService.verifyToken(token, 'access');
        } catch (error) {
            console.warn('[WARN] Token verification failed in getPaginated. Returning products without likes.');
            // Возвращаем продукты без информации о лайках при истекшем/недействительном токене
            return await Promise.all(res.map(async product => ({
                id: product.id,
                uuid: product.uuid,
                price_currency: product.price_currency,
                shortDesc: product.translate[0]?.shortDesc,
                title: product.translate[0]?.title,
                photo_url: product.photo_url,
                price_points: product.price_points,
                percent_discount: product.percent_discount,
                rating: await this.calculateProductRating(product.id),
                commentsCount: await this.getProductCommentsCount(product.id),
                categories: product.categories.map(cat => ({
                    id: cat.id,
                    uuid: cat.uuid,
                    label: cat.label,
                    labelColor: cat.labelColor,
                    translate: [{
                        name: cat.translate[0]?.name,
                        language: cat.translate[0]?.language,
                    }]
                })),
            })));
        }
    
        return await Promise.all(
            res.map(async product => ({
                id: product.id,
                uuid: product.uuid,
                price_currency: product.price_currency,
                shortDesc: product.translate[0]?.shortDesc,
                title: product.translate[0]?.title,
                photo_url: product.photo_url,
                price_points: product.price_points,
                percent_discount: product.percent_discount,
                rating: await this.calculateProductRating(product.id),
                commentsCount: await this.getProductCommentsCount(product.id),
                like: await this.likeService.findOne(userPayload.id, product.id),
                categories: product.categories.map(cat => ({
                    id: cat.id,
                    uuid: cat.uuid,
                    label: cat.label,
                    labelColor: cat.labelColor,
                    translate: [{
                        name: cat.translate[0]?.name,
                        language: cat.translate[0]?.language,
                    }]
                })),
                isPublished: product.isPublished,
                inStock: product.inStock
            }))
        );

    }


    public async getAll(language: string, token?: string) {
        console.log("IN GET ALL");
        let isAdmin = false;

        if (token) {
            try {
                const userPayload = await this.tokenService.verifyToken(token, 'access');
                console.log(userPayload)
                isAdmin = userPayload.role.name === 'admin'; // Проверка роли
            } catch (error) {
                console.warn('Token verification failed. Assuming user role.');
            }
        }

        const query = this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.categories', 'categories')
            .leftJoin('categories.translate', 'category_t')
            .addSelect(['category_t.name', 'category_t.language', 'categories.label', 'categories.labelColor'])
            .leftJoin('product.translate', 'product_t')
            .addSelect(['product_t.title', 'product_t.language'])
            .where('product_t.language = :language', { language })
            .andWhere('category_t.language = :language', { language });

        // Если пользователь не админ, добавляем фильтрацию по isPublished
        if (!isAdmin) {
            query.andWhere('product.isPublished = :isPublished', { isPublished: true });
        }

        const res = await query.getMany();

        return res.map(product => {
            // Extract the necessary translations from the nested arrays
            // const categoryTranslation = product.category.translate[0];
            const productTranslation = product.translate?.find(t => t.language === language);

            const categories = product.categories.map(category => {
                const categoryTranslation = category.translate?.find(t => t.language === language);
                return {
                    id: category.id,
                    uuid: category.uuid,
                    createdAt: category.createdAt,
                    updatedAt: category.updatedAt,
                    image: category.image,
                    label: category.label,
                    labelColor: category.labelColor,
                    translate: [{
                        name: categoryTranslation?.name,
                        language: categoryTranslation?.language,
                    }]
                };
            });
            // Return the transformed product
            return {
                id: product.id,
                uuid: product.uuid,
                createdAt: product.createdAt,
                price_currency: product.price_currency,
                categories: categories, // Обновлено для поддержки нескольких категорий
                title: productTranslation?.title,
                language: productTranslation?.language,
                isPublished: product.isPublished,
                inStock: product.inStock
            };
        });    
    }

    public async getOneWithComments(uuid: string, language: string, token?: string) {
        // const res = await this.productRepository.findOne({
        //     where: { uuid },
        //     relations: ['comments', 'comments.user', 'category'],
        // });
        console.log('uuid => ', uuid);
        console.log('language => ', language);
        const res = await this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.comments', 'comments') // Комментарии
            .leftJoinAndSelect('comments.user', 'commentUser') // Пользователи комментариев
            .leftJoinAndSelect('product.categories', 'categories') // ManyToMany: категории продукта
            .leftJoin('categories.translate', 'category_t') // Переводы категорий
            .addSelect(['category_t.name', 'category_t.language', 'categories.label', 'categories.labelColor'])
            .leftJoin('product.translate', 'product_t') // Переводы продукта
            .addSelect([
                'product_t.title',
                'product_t.language',
                'product_t.shortDesc',
                'product_t.desc',
                'product_t.seoTitle',
                'product_t.seoDescription',
            ])
            .where('product.uuid = :productUid', { productUid: uuid })
            .andWhere('product_t.language = :language', { language })
            .andWhere('category_t.language = :language', { language })
            .getOne();

        console.log('res => ', res);

        if (!res) {
            throw new NotFoundException(`Product with UUID ${uuid} not found`);
        }
    
        let updatedRes;
        const { translate, ...other } = res;
        updatedRes = {
            ...other,
            title: translate[0].title,
            desc: translate[0].desc,
            shortDesc: translate[0].shortDesc,
            seoTitle: translate[0].seoTitle,
            seoDescription: translate[0].seoDescription,
            language: translate[0].language,
            inStock: res.inStock,
            rating: await this.calculateProductRating(res.id),
        }

        if (!token) {
            return {
                ...updatedRes,
                canComment: false, // Неавторизованный пользователь не может комментировать
            };
        }

        let userPayload;
        try {
            userPayload = await this.tokenService.verifyToken(token, 'access');
        } catch (e) {
            console.log('[WARN] User is not authorized! Token => ', token);
            // Возвращаем данные продукта без информации о лайке при истекшем/недействительном токене
            return {
                ...updatedRes,
                canComment: false,
            };
        }

        // Проверяем, может ли пользователь комментировать этот товар
        const canComment = await this.canUserCommentProduct(userPayload.uuid, uuid);

        return {
            ...updatedRes,
            like: await this.likeService.findOne(userPayload.id, res.id),
            canComment: canComment,
        };
    }

    public async findOneByUid(uuid: string) {
        return await this.productRepository.findOne({
            where: { uuid },
        });
    }

    public async findOneById(id: number) {
        return await this.productRepository.findOne({
            where: { id },
        });
    }

    public async likeProduct(productUuid: string, token: string) {
        const userPayload = await this.tokenService.verifyToken(
            token,
            'access'
        );

        const product = await this.findOneByUid(productUuid);

        return await this.likeService.setLike(userPayload.uuid, product);
    }

    public async create(createProductDto: Omit<CreateProductDto, 'rating'>) {
        const categories = await this.categoryService.findSubcategoriesByIds(
            createProductDto.categoryIds
        );

        // Сначала создаем и сохраняем продукт без переводов
        const newProduct = this.productRepository.create({
            photo_url: createProductDto.photo_url,
            price_currency: createProductDto.price_currency,
            price_points: createProductDto.price_points,
            percent_discount: createProductDto.percent_discount,
            rating: 0,
            categories: categories,
            descriptionPoints: createProductDto.descriptionPoints,
            isPublished: createProductDto.isPublished || false,
            inStock: createProductDto.inStock !== undefined ? createProductDto.inStock : true,
        });

        const savedProduct = await this.productRepository.save(newProduct);

        // Теперь создаем переводы со ссылкой на продукт
        const translations = [];
        for (const translation of createProductDto.translate) {
            console.log('Translation: ', translation);
            const newTranslate = this.productTranslateRepository.create({
                ...translation,
                product: savedProduct,
            });
            const savedTranslate = await this.productTranslateRepository.save(newTranslate);
            translations.push(savedTranslate);
        }

        // Обновляем продукт с переводами
        savedProduct.translate = translations;
        return savedProduct;
    }

    async update(uuid: string, updateProductDto: UpdateProductDto, language: string) {
        console.log("=== PRODUCT UPDATE START ===");
        console.log("Product UUID:", uuid);
        console.log("Update DTO:", JSON.stringify(updateProductDto, null, 2));
        console.log("Language:", language);

        // Сначала обработаем переводы отдельно, если они есть
        if (updateProductDto.translate) {
            console.log("=== UPDATING TRANSLATIONS ===");
            const product = await this.productRepository.findOne({
                where: { uuid },
                relations: ['translate'],
            });

            if (!product) {
                throw new BadRequestException('Wrong uuid!');
            }

            console.log("Current translations:", product.translate);
            console.log("New translation data:", updateProductDto.translate);

            const savedTranslation = await this.productTranslateRepository.save({
                ...product.translate[0],
                ...updateProductDto.translate,
            });
            console.log("Translation saved:", savedTranslation);
        }

        // Теперь обработаем категории отдельно, если они есть
        if (updateProductDto.categoryIds) {
            console.log("=== UPDATING CATEGORIES ===");
            console.log("Category IDs to set (raw):", updateProductDto.categoryIds);
            
            // Фильтруем null значения из categoryIds
            const validCategoryIds = updateProductDto.categoryIds.filter(id => id !== null && id !== undefined);
            console.log("Category IDs to set (filtered):", validCategoryIds);
            
            const newCategories = await this.categoryService.findSubcategoriesByIds(validCategoryIds);
            console.log('Found new categories:', newCategories.map(c => ({ id: c.id, uuid: c.uuid })));

            // Сначала найдем продукт, чтобы получить его ID и текущие категории
            const productForCategories = await this.productRepository.findOne({
                where: { uuid },
                relations: ['categories']
            });

            if (productForCategories) {
                console.log("Product found for categories update:", { id: productForCategories.id, uuid: productForCategories.uuid });
                const currentCategories = productForCategories.categories || [];
                console.log('Current categories:', currentCategories.map(c => ({ id: c.id, uuid: c.uuid })));

                // Сначала удаляем все текущие категории
                if (currentCategories.length > 0) {
                    console.log("Removing current categories...");
                    await this.productRepository
                        .createQueryBuilder()
                        .relation(ProductEntity, 'categories')
                        .of(productForCategories.id)
                        .remove(currentCategories);
                    console.log("Current categories removed");
                }

                // Затем добавляем новые категории
                if (newCategories.length > 0) {
                    console.log("Adding new categories...");
                    await this.productRepository
                        .createQueryBuilder()
                        .relation(ProductEntity, 'categories')
                        .of(productForCategories.id)
                        .add(newCategories);
                    console.log("New categories added");
                }

                // Проверяем результат
                const updatedProduct = await this.productRepository.findOne({
                    where: { uuid },
                    relations: ['categories']
                });
                console.log('Categories after update:', updatedProduct?.categories?.map(c => ({ id: c.id, uuid: c.uuid })));
            } else {
                console.log("ERROR: Product not found for categories update");
            }
        } else {
            console.log("=== NO CATEGORIES UPDATE REQUESTED ===");
        }

        // Теперь загружаем продукт без сложных отношений и обновляем остальные поля
        console.log("=== UPDATING SIMPLE FIELDS ===");
        const product = await this.productRepository.findOne({
            where: { uuid }
        });

        if (!product) {
            throw new BadRequestException('Wrong uuid!');
        }

        console.log("Product found for simple fields update:", { id: product.id, uuid: product.uuid });

        // Проверяем, изменился ли статус inStock с false на true
        const wasOutOfStock = !product.inStock;
        const willBeInStock = updateProductDto.inStock !== undefined ? updateProductDto.inStock : product.inStock;

        // Создаем копию DTO без полей, которые мы уже обработали
        const { translate, categoryIds, ...simpleFields } = updateProductDto;
        console.log("Simple fields to update:", simpleFields);
        
        // Обновляем простые поля
        const updatedProduct = await this.productRepository.save({
            ...product,
            ...simpleFields
        });
        console.log("Simple fields updated:", { id: updatedProduct.id, uuid: updatedProduct.uuid });

        // Если товар стал в наличии (был недоступен, а теперь доступен), уведомляем watchers
        if (wasOutOfStock && willBeInStock) {
            console.log("=== NOTIFYING WATCHERS ===");
            // Используем отдельный запрос для уведомления, чтобы избежать циклических зависимостей
            this.notifyProductWatchers(updatedProduct.uuid);
        }

        console.log("=== PRODUCT UPDATE COMPLETE ===");
        return updatedProduct;
        
        // if ('translate' in updateProductDto) {
        //     const { translate, ...other } = updateProductDto;

        //     await this.productTranslateRepository.save({
        //         ...product.translate[0],
        //         ...updateProductDto.translate,
        //     });
        //     return await this.productRepository.save({
        //         ...product,
        //         ...other,
        //     });
        // } else {
        //     return await this.productRepository.save({
        //         ...product,
        //         ...updateProductDto as Partial<ProductEntity>,
        //     });
        // }
    }

    async delete(uuid: string) {
        const product = await this.productRepository.findOneByOrFail({ uuid });

        // delete all relations
        // translation
        await this.deleteTranslationsByProduct(product.id);
        // likes
        await this.likeService.deleteLikesByProduct(product.id);
        // cart
        await this.cartService.deleteByProductId(product.id);
        // comments
        await this.deleteCommentsByProduct(product.id);

        return await this.productRepository.remove(product);
    }

    async deleteTranslationsByProduct(productId: number) {
        return await this.productTranslateRepository
            .createQueryBuilder('product_t')
            .delete()
            .from(ProductTranslateEntity)
            .where('product_t."product_id" = :productId', { productId })
            .execute()
    }

    async deleteCommentsByProduct(productId: number) {
        return await this.commentRepository
            .createQueryBuilder('comment')
            .delete()
            .from(CommentEntity)
            .where('comment."product_id" = :productId', { productId })
    }

    // Метод для создания тестовых данных с рейтингами
    async createTestRatingData() {
        console.log('[TEST DATA] Starting to create test rating data...');
        
        // Находим несколько первых продуктов
        const products = await this.productRepository.find({
            take: 5, // Возьмем первые 5 продуктов
        });

        console.log(`[TEST DATA] Found ${products.length} products to add ratings`);

        // Находим первого пользователя для создания комментариев
        const user = await this.userRepository.findOne({
            where: {},
            order: { id: 'ASC' }
        });

        if (!user) {
            throw new Error('No users found in database');
        }

        console.log(`[TEST DATA] Using user ${user.id} for comments`);

        const testComments = [];

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            // Создаем 2-3 комментария для каждого продукта с разными рейтингами
            const ratingsForProduct = [
                { rating: 5, text: 'Отличный товар! Очень доволен покупкой.' },
                { rating: 4, text: 'Хорошее качество, рекомендую.' },
                { rating: 3, text: 'Неплохо, но есть недостатки.' },
            ];

            // Добавляем случайное количество комментариев (1-3)
            const commentsCount = Math.floor(Math.random() * 3) + 1;
            
            for (let j = 0; j < commentsCount; j++) {
                const commentData = ratingsForProduct[j];
                
                const comment = await this.commentRepository.save({
                    text: commentData.text,
                    rating: commentData.rating,
                    user: { id: user.id },
                    product: { id: product.id },
                });
                
                testComments.push(comment);
                console.log(`[TEST DATA] Created comment for product ${product.id}: rating ${commentData.rating}`);
            }
        }

        console.log(`[TEST DATA] Successfully created ${testComments.length} test comments`);
        
        return {
            message: `Created ${testComments.length} test comments for ${products.length} products`,
            comments: testComments.length,
            products: products.length
        };
    }

    // public async findAllByQuery(query: ProductQueryDto) {
    //     const queryBuilder = this.productRepository.createQueryBuilder();

    //     for (const param in query) {
    //         switch (param) {
    //             case 'categoryId':
    //                 return await this.categoryService.findProductsByCategoryId(
    //                     query[param]
    //                 );
    //             case 'categoryName':
    //                 return await this.categoryService.findProductsByCategoryName(
    //                     query[param]
    //                 );
    //             case 'isTop':
    //                 queryBuilder.orderBy('price_currency', 'ASC');
    //                 break;
    //             case 'isRelevant':
    //                 queryBuilder.orderBy('price_currency', 'DESC');
    //                 break;
    //             case 'take':
    //                 queryBuilder.take(query[param] as number);
    //                 break;
    //             default:
    //                 throw new BadRequestException(
    //                     `Unknown query param: ${param}=${query[param]}`
    //                 );
    //         }
    //     }

    //     // if no params - return all
    //     return await queryBuilder.getMany();
    // }
    // //const queryBuilder = this.productRepository.createQueryBuilder('product');
    // //
    // //         for (const param in query) {
    // //             switch (param) {
    // //                 case 'categoryId':
    // //                     queryBuilder.innerJoin('product.category', 'category', `category.id = :${param}`, { [param]: query[param] });
    // //                     break;
    // //                 case 'categoryName':
    // //                     queryBuilder.innerJoin('product.category', 'category', `category.name = :${param}`, { [param]: query[param] });
    // //                     break;
    // //                 default:
    // //                     throw new BadRequestException(`Unknown query param: ${param}=${query[param]}`);
    // //             }
    // //         }
    // //
    // //         return queryBuilder.getMany();

    // public async findOneById(uuid: string) {
    //     return await this.productRepository.findOneOrFail({ where: { uuid } });
    // }

    // update(id: number, updateProductDto: UpdateProductDto) {
    //     return `This action updates a #${id} product`;
    // }

    // remove(id: number) {
    //     return `This action removes a #${id} product`;
    // }

    /**
     * Уведомляет пользователей, отслеживающих товар, о том что он стал доступен
     */
    private async notifyProductWatchers(productUuid: string): Promise<void> {
        try {
            // Используем прямой запрос к базе, чтобы избежать циклических зависимостей
            const productWatchRepository = this.productRepository.manager.getRepository('ProductWatchEntity');
            
            const watches = await productWatchRepository.find({
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
                await productWatchRepository.save(watch);
            }

            // Здесь можно добавить логику отправки email/push уведомлений
            console.log(`Notified ${watches.length} users about product ${productUuid} availability`);
        } catch (error) {
            console.error('Error notifying product watchers:', error);
        }
    }
}
