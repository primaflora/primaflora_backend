import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CategoryEntity } from '../entity/category.entity';
import { SubcategoryEntity } from 'src/entity/subcategory.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { LikeService } from 'src/like/like.service';
import { TokenService } from 'src/token/token.service';
import { SubcategoryDto } from './dto/subcategory.dto';
import { SubcategoryTranslateEntity } from 'src/entity/subcategory_t.entity';
import { ProductDto } from 'src/products/dto/product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

@Injectable()
export class CategoriesService {
    constructor(
        private readonly dataSource: DataSource, 
        @InjectRepository(CategoryEntity)
        private categoryRepository: Repository<CategoryEntity>,
        @InjectRepository(SubcategoryEntity)
        private subcategoryRepository: Repository<SubcategoryEntity>,
        @InjectRepository(SubcategoryTranslateEntity)
        private subcategoryTranslateRepository: Repository<SubcategoryTranslateEntity>,
        @InjectRepository(CommentEntity)
        private commentRepository: Repository<CommentEntity>,
        private readonly likeService: LikeService,
        private readonly tokenService: TokenService
    ) {}

    // Метод для динамического подсчета среднего рейтинга продукта
    private async calculateProductRating(productId: number): Promise<number> {
        const comments = await this.commentRepository.find({
            where: { product: { id: productId } }
        });

        if (comments.length === 0) {
            return 0;
        }

        const totalRating = comments.reduce((sum, comment) => sum + comment.rating, 0);
        return Math.round((totalRating / comments.length) * 10) / 10;
    }

    public async findAllCategories(): Promise<CategoryEntity[]> {
        return await this.categoryRepository.find({order: { order: 'ASC' }, relations: ['childrens', 'childrens.translate']});
    }

    public async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryEntity> {
        const category = await this.categoryRepository.findOne({ 
            where: { uuid: id },
            relations: ['childrens'] // ВАЖНО: загружаем отношения!
        });

        if (!category) {
            throw new NotFoundException(`Категория с id ${id} не найдена`);
        }

        console.log(`[updateCategory] Before update: category ${category.name_ukr} has ${category.childrens?.length || 0} children`);

        // Обновляем только переданные поля, чтобы не потерять отношения
        if (updateCategoryDto.name_ukr !== undefined) {
            category.name_ukr = updateCategoryDto.name_ukr;
        }
        if (updateCategoryDto.order !== undefined) {
            category.order = updateCategoryDto.order;
        }

        const savedCategory = await this.categoryRepository.save(category);
        console.log(`[updateCategory] After update: category ${savedCategory.name_ukr} has ${savedCategory.childrens?.length || 0} children`);
        
        return savedCategory;
    }

    async updateOrder(data: { id: string; order: number }[]): Promise<void> {
        for (const { id, order } of data) {
          await this.updateCategory(id, { order });
        }
    }
    public async reorderSubcategories(orderedIds: { id: string; order: number }[]): Promise<void> {
        await Promise.all(
            orderedIds.map(({ id, order }) =>
              this.subcategoryRepository.update({uuid: id}, { order })
            )
        );
      }

    public async updateSubcategory(id: string, subcategoryDto: UpdateSubcategoryDto) {
        const subcategory = await this.subcategoryRepository.findOne({
          where: { uuid: id },
          relations: ['translate', 'parent'],
        });
      
        if (!subcategory) {
          throw new NotFoundException(`Подкатегория с id ${id} не найдена`);
        }

        // Инициализируем OneToMany и ManyToMany отношения как массивы, если они не определены
        if (!subcategory.translate || !Array.isArray(subcategory.translate)) {
            subcategory.translate = [];
        }
        if (!subcategory.products || !Array.isArray(subcategory.products)) {
            subcategory.products = [];
        }
      
        // Обновить изображение
        if (subcategoryDto.image) {
          subcategory.image = subcategoryDto.image;
        }
      
        // Обновить родительскую категорию, если передан новый parentId
        console.log(subcategoryDto.parentId)
        if (
          subcategoryDto.parentId &&
          (!subcategory.parent || subcategory.parent.uuid !== subcategoryDto.parentId)
        ) {
          const newParent = await this.categoryRepository.findOne({
            where: { uuid: subcategoryDto.parentId },
          });
      
          if (!newParent) {
            throw new NotFoundException(`Категория с id ${subcategoryDto.parentId} не найдена`);
          }
      
          subcategory.parent = newParent;
        }
      
        // Обновить перевод
        const language = subcategoryDto.translate.language;
        const existingTranslation = subcategory.translate.find((t) => t.language === language);
      
        if (existingTranslation) {
          existingTranslation.name = subcategoryDto.translate.name;
          existingTranslation.desc = subcategoryDto.translate.desc;
          await this.subcategoryTranslateRepository.save(existingTranslation);
        }
      
        return await this.subcategoryRepository.save(subcategory);
    }

    public async deleteCategory(id: string): Promise<void> {
        const result = await this.categoryRepository.delete({ uuid: id });

        if (result.affected === 0) {
            throw new NotFoundException(`Категория с id ${id} не найдена`);
        }
    }

    public async deleteSubcategory(id: string): Promise<void> {
        const subcategory = await this.subcategoryRepository.findOne({
          where: { uuid: id },
          relations: ['translate', 'products'],
        });
      
        if (!subcategory) {
          throw new NotFoundException(`Подкатегория с id ${id} не найдена`);
        }
      
        // Удаляем связи между подкатегорией и продуктами из join-таблицы
        if (subcategory.products && subcategory.products.length > 0) {
          await this.dataSource
            .createQueryBuilder()
            .relation(SubcategoryEntity, 'products')
            .of(subcategory) // укажем конкретную подкатегорию
            .remove(subcategory.products); // удаляем все связи
        }
      
        // Удаление переводов (они у тебя настроены с cascade + onDelete: 'CASCADE', так что можно пропустить вручную)
        // await this.subcategoryTranslateRepository.delete({ subcategory });
      
        // Удаление подкатегории
        await this.subcategoryRepository.delete({ uuid: id });
    }      

    public async getAllSubcategories() {
        return await this.subcategoryRepository.find({
            relations: ['translate', 'parent'], // Подгружаем переводы и категорию
        });
    }
    
    // Диагностический метод для проверки связей
    public async diagnoseOrphantSubcategories() {
        console.log('[DIAGNOSTIC] Checking orphan subcategories...');
        
        const allSubcategories = await this.subcategoryRepository.find({
            relations: ['translate', 'parent']
        });
        
        const orphans = allSubcategories.filter(sub => !sub.parent);
        
        console.log(`[DIAGNOSTIC] Found ${orphans.length} orphan subcategories out of ${allSubcategories.length} total:`);
        
        for (const orphan of orphans) {
            const translation = orphan.translate?.find(t => t.language === 'ukr');
            console.log(`[DIAGNOSTIC] Orphan: ${orphan.uuid} - "${translation?.name || 'No name'}" (id: ${orphan.id})`);
        }
        
        return {
            totalSubcategories: allSubcategories.length,
            orphanSubcategories: orphans.length,
            orphans: orphans.map(orphan => {
                const translation = orphan.translate?.find(t => t.language === 'ukr');
                return {
                    id: orphan.id,
                    uuid: orphan.uuid,
                    name: translation?.name || 'No name'
                };
            })
        };
    }
    
    // Метод для восстановления связей между подкатегориями и категориями
    public async fixOrphanSubcategories() {
        console.log('[FIX] Starting to fix orphan subcategories...');
        
        // Мапинг подкатегорий к категориям на основе логики названий
        const subcategoryToCategory = {
            // Косметичні засоби (id: 68, uuid: e679a1b7-f729-411b-9a01-025833a9b429)
            'Profline – Професійний догляд за шкірою в домашніх умовах': 68,
            'Profline Biogold - Серія з біозолотом': 68,
            
            // ДРУКОВАНА ПРОДУКЦІЯ (id: 104, uuid: b94e9bd8-3567-41eb-9d0c-1eaa2fdcdb2d)
            'Література компанії': 104,
            
            // СИСТЕМИ ОРГАНІЗМУ (id: 103, uuid: a6a2015e-509d-42c0-a1f0-efcbb2958a83)
            'Покривна система': 103,
            'Продукція для дітей': 101, // Дієтичні добавки
            
            // Новий блок продукту (id: 199, uuid: 9fadc1e6-b0b7-4de6-8bc1-b48be57aa53b) 
            'Нова підкатегорія': 199,
            'Сувенірна продукція': 199,
            'Актуально зараз': 199,
            'ТОП продажів': 199,
            'Акції': 199,
            'ttt': 199, // Тестовая категория
        };
        
        const orphans = await this.subcategoryRepository.find({
            relations: ['translate', 'parent']
        });
        
        const actualOrphans = orphans.filter(sub => !sub.parent);
        let fixedCount = 0;
        
        for (const orphan of actualOrphans) {
            const translation = orphan.translate?.find(t => t.language === 'ukr');
            const name = translation?.name || '';
            
            if (subcategoryToCategory[name]) {
                const categoryId = subcategoryToCategory[name];
                const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
                
                if (category) {
                    orphan.parent = category;
                    await this.subcategoryRepository.save(orphan);
                    console.log(`[FIX] Fixed: "${name}" -> "${category.name_ukr}" (category id: ${categoryId})`);
                    fixedCount++;
                } else {
                    console.log(`[FIX] Warning: Category with id ${categoryId} not found for subcategory "${name}"`);
                }
            } else {
                console.log(`[FIX] Warning: No mapping found for subcategory "${name}"`);
            }
        }
        
        console.log(`[FIX] Fixed ${fixedCount} out of ${actualOrphans.length} orphan subcategories`);
        
        return {
            totalOrphans: actualOrphans.length,
            fixedCount: fixedCount,
            message: `Fixed ${fixedCount} orphan subcategories`
        };
    }
    
    public async createCategory(categoryData: CreateCategoryDto): Promise<CategoryEntity> {
        console.log(categoryData)
        const newCategory = this.categoryRepository.create({
            ...categoryData,
            childrens: [] // Явно инициализируем пустой массив для отношения OneToMany
        });
        return await this.categoryRepository.save(newCategory);
    }

    public async createSubcategory(subcategory: SubcategoryDto) {
        const parent = await this.categoryRepository.findOneOrFail({
            where: { uuid: subcategory.parent_uid },
        });

        const newSubcategory = await this.subcategoryRepository.create({
            image: subcategory.image,
            parent: parent,
        });

        const translations = [];
        for (const translation of subcategory.translate) {
            const newTranslate = await this.subcategoryTranslateRepository.save(
                {
                    name: translation.name,
                    desc: translation.desc,
                    language: translation.language,
                }
            );
            console.log('new translate => ', newTranslate);
            translations.push(newTranslate);
        }

        newSubcategory.translate = translations;
        return await this.subcategoryRepository.save(newSubcategory);
    }

    public async getSubcategory(uuid: string) {
        return await this.subcategoryRepository.findOneOrFail({
            where: { uuid },
            relations: ['translate', 'parent'],
        });
    }

    public async findSubcategoryById(id: number) {
        return await this.subcategoryRepository.findOneOrFail({
            where: { id },
        });
    }
    public async findSubcategoriesByIds(ids: number[]) {
        return await this.subcategoryRepository.findBy({ id: In(ids) });
    }

    async moveToAnotherCategory(subcategoryId: string, newCategoryId: string): Promise<void> {
        const subcategory = await this.subcategoryRepository.findOne({
          where: { uuid: subcategoryId },
          relations: ['parent'],
        });
        if (!subcategory) throw new NotFoundException('Подкатегория не найдена');
      
        const newParent = await this.categoryRepository.findOne({ where: { uuid: newCategoryId } });
        if (!newParent) throw new NotFoundException('Категория не найдена');
      
        subcategory.parent = newParent;
        await this.subcategoryRepository.save(subcategory);
      }
    
    public async findAllWithSub(language: string = 'ukr') {
        console.log('[CategoriesService] Getting categories with subcategories for language:', language);
        
        const categories = await this.categoryRepository
            .createQueryBuilder('category')
            .leftJoinAndSelect('category.childrens', 'subcategory')
            .leftJoinAndSelect('subcategory.translate', 'subcategoryTranslate', 'subcategoryTranslate.language = :language')
            .orderBy('category.order', 'ASC')             // Сортировка категорий
            .addOrderBy('subcategory.order', 'ASC')       // Сортировка подкатегорий
            .setParameter('language', language)
            .getMany();
            

            
        console.log(`[CategoriesService] Found ${categories.length} categories`);
    
        const transformCategories = categories.map(category => {
            const sortedChildrens = [...(category.childrens || [])].sort(
                (a, b) => (a.order ?? 0) - (b.order ?? 0)
            );
    
            return {
                id: category.id,
                uuid: category.uuid,
                name: category.name_ukr,
                childrens: sortedChildrens.map(subcategory => {
                    const translation = subcategory.translate.find(t => t.language === language);
                    return {
                        id: subcategory.id,
                        uuid: subcategory.uuid,
                        image: subcategory.image,
                        name: translation?.name || '',
                        desc: translation?.desc || '',
                        language: translation?.language || language,
                    };
                }),
            };
        });
        
        return transformCategories;
    }
    

    public async findSubcategoryWithProducts(
        subcategoryId: number,
        language: string,
        token?: string
    ) {
        let isAdmin = false;

        // Проверка роли пользователя по токену
        if (token) {
            try {
                const userPayload = await this.tokenService.verifyToken(token, 'access');
                isAdmin = userPayload.role === 'admin';
            } catch (error) {
                console.warn('Token verification failed. Assuming user is not admin.');
            }
        }
        const subcategory = await this.subcategoryRepository
        .createQueryBuilder('subcategory')
        .leftJoinAndSelect('subcategory.products', 'product') // ManyToMany связь
        .leftJoinAndSelect('product.comments', 'comment')
        .leftJoinAndSelect('subcategory.translate', 'subcategoryTranslate')
        .leftJoin('product.translate', 'product_t')
        .addSelect([
            'product_t.title',
            'product_t.language',
            'product_t.shortDesc',
        ])
        .where('subcategory.id = :subcategoryId', { subcategoryId })
        .andWhere('product_t.language = :language', { language })
        .andWhere('subcategoryTranslate.language = :language', { language })
        .andWhere(
            isAdmin ? '1=1' : 'product.isPublished = :isPublished',
            { isPublished: true }
        )
        .getOne();

    if (!subcategory?.products) {
        return {
            ...subcategory,
            products: [],
        };
    }

    // Если токен не передан, возвращаем данные без лайков
    if (!token) {
        return {
            ...subcategory,
            products: await Promise.all(subcategory.products.map(async product => {
                const { translate, ...other } = product;
                return {
                    ...other,
                    title: translate[0]?.title,
                    shortDesc: translate[0]?.shortDesc,
                    language: translate[0]?.language,
                    rating: await this.calculateProductRating(product.id),
                    commentsCount: product.comments.length,
                };
            })),
        };
    }

    // Получение данных о пользователе
    const userPayload = await this.tokenService.verifyToken(token, 'access');

    return {
        ...subcategory,
        products: await Promise.all(
            subcategory.products.map(async product => {
                const { translate, ...other } = product;
                return {
                    ...other,
                    title: translate[0]?.title,
                    shortDesc: translate[0]?.shortDesc,
                    language: translate[0]?.language,
                    rating: await this.calculateProductRating(product.id),
                    commentsCount: product.comments.length,
                    like: await this.likeService.findOne(
                        userPayload.id,
                        product.id
                    ),
                };
            }),
        ),
    };
    }
}
