import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CategoryEntity } from '../entity/category.entity';
import { SubcategoryEntity } from 'src/entity/subcategory.entity';
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
        private readonly likeService: LikeService,
        private readonly tokenService: TokenService
    ) {}

    public async findAllCategories(): Promise<CategoryEntity[]> {
        return await this.categoryRepository.find({order: { order: 'ASC' }, relations: ['childrens', 'childrens.translate']});
    }

    public async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryEntity> {
        const category = await this.categoryRepository.findOne({ where: { uuid: id } });

        if (!category) {
            throw new NotFoundException(`Категория с id ${id} не найдена`);
        }

        Object.assign(category, updateCategoryDto);
        return await this.categoryRepository.save(category);
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
        // Сначала находим категорию со всеми подкатегориями
        const category = await this.categoryRepository.findOne({
            where: { uuid: id },
            relations: ['childrens']
        });

        if (!category) {
            throw new NotFoundException(`Категория с id ${id} не найдена`);
        }

        // Если есть подкатегории, сначала удаляем их
        if (category.childrens && category.childrens.length > 0) {
            // Удаляем все подкатегории этой категории
            for (const subcategory of category.childrens) {
                await this.deleteSubcategory(subcategory.uuid);
            }
        }

        // Теперь удаляем саму категорию
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
            relations: ['translate'], // Подгружаем переводы и категорию, если нужно
        });
    }
    
    public async createCategory(categoryData: CreateCategoryDto): Promise<CategoryEntity> {
        console.log(categoryData)
        const newCategory = this.categoryRepository.create(categoryData);
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
            relations: ['translate'],
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
        const categories = await this.categoryRepository
            .createQueryBuilder('category')
            .leftJoinAndSelect('category.childrens', 'subcategory')
            .leftJoinAndSelect('subcategory.translate', 'subcategoryTranslate')
            .where('subcategoryTranslate.language = :language', { language })
            .orderBy('category.order', 'ASC')             // Сортировка категорий
            .addOrderBy('subcategory.order', 'ASC')       // Сортировка подкатегорий
            .getMany();
    
        const transformCategories = categories.map(category => {
            const sortedChildrens = [...category.childrens].sort(
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
            products: subcategory.products.map(product => {
                const { translate, ...other } = product;
                return {
                    ...other,
                    title: translate[0]?.title,
                    shortDesc: translate[0]?.shortDesc,
                    language: translate[0]?.language,
                    comments: product.comments.length,
                };
            }),
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
                    comments: product.comments.length,
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
