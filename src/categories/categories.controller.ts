import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
    UsePipes,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { Request } from 'express';
import { AcceptLanguage } from 'src/common/decorators/accept-language.decorator';
import { ValidateLanguagePipe } from 'src/common/pipes/accept-language.pipe';
import { CategoriesService } from './categories.service';
import { SubcategoryDto } from './dto/subcategory.dto';
import { SubcategoryWithImageDto } from './dto/subcategory-with-image.dto';
import { SubcategoryWithExistingImageDto } from './dto/subcategory-with-existing-image.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UploadService } from 'src/upload/upload.service';

@Controller('categories')
export class CategoriesController {
    constructor(
        private readonly categoriesService: CategoriesService,
        private readonly uploadService: UploadService
    ) {}

    @Get()
    public async findAllCategories() {
        return await this.categoriesService.findAllCategories();
    }

    @Get('findAllWithSub')
    @UsePipes(new ValidateLanguagePipe())
    public async findAllWithSub(
        @Req() req: Request,
        @AcceptLanguage() language: string
    ) {
        return await this.categoriesService.findAllWithSub(language);
    }

    // return subcategories with products. Products have minimal fields to be shown (not description and comments)
    @Get('/findSubcategoryWithProducts/:subcategoryId')
    @UsePipes(new ValidateLanguagePipe())
    public async findSubcategoryWithProducts(
        @Param('subcategoryId') subcategoryId: number,
        @Req() req: Request,
        @AcceptLanguage() language: string
    ) {
        let token = null; 
        if (req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1].trim();
        }

        return await this.categoriesService.findSubcategoryWithProducts(
            subcategoryId,
            language,
            token
        );
    }

    @Put('/subcategory/:uuid/move')
    async moveSubcategory(
        @Param('uuid') subcategoryId: string,
        @Body() body: { newCategoryId: string },
    ) {
        return this.categoriesService.moveToAnotherCategory(subcategoryId, body.newCategoryId);
    }
    @Put('/reorder')
    async reorderCategories(@Body() body: { orderedIds: { id: string, order: number }[] }) {
        console.log(body)
        await this.categoriesService.updateOrder(body.orderedIds);
        return { success: true };
    }
    @Put('/subcategory/reorder')
    async reorderSubcategories(@Body() body: { orderedIds: { id: string; order: number }[] }) {
    await this.categoriesService.reorderSubcategories(body.orderedIds);
      return { success: true };
    }
    
    @Put(':id')
    public async updateCategory(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        console.log("inside")
        return await this.categoriesService.updateCategory(id, updateCategoryDto);
    }

    @Post()
    async createCategory(@Body() categoryData: CreateCategoryDto) {
      return await this.categoriesService.createCategory(categoryData);
    }

    @Post('/subcategory/create')
    public async createSubategory(@Body() subcategoryDto: SubcategoryDto) {
        return await this.categoriesService.createSubcategory(subcategoryDto);
    }

    @Post('/subcategory/create-with-image')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const timestamp = Date.now();
                    const randomNum = Math.round(Math.random() * 1e9);
                    const originalName = file.originalname;
                    const extension = originalName.split('.').pop();
                    const filename = `${timestamp}-${randomNum}.${extension}`;
                    cb(null, filename);
                },
            }),
            fileFilter: (req, file, cb) => {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Только изображения разрешены!'), false);
                }
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    )
    public async createSubcategoryWithImage(
        @UploadedFile() image: Express.Multer.File,
        @Body() body: any,
        @Req() req: Request
    ) {
        console.log('=== Создание подкатегории с изображением ===');
        console.log('Received body:', body);
        console.log('Received file:', image ? { 
            filename: image.filename, 
            size: image.size, 
            mimetype: image.mimetype 
        } : 'No file');

        // Генерируем URL изображения
        let imageUrl = '';
        if (image) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            imageUrl = `${baseUrl}/uploads/${image.filename}`;
            console.log('Generated image URL:', imageUrl);
        }

        // Парсим данные из form-data
        const subcategoryData = {
            image: imageUrl,
            parent_uid: body.parent_uid,
            translate: body.translate ? JSON.parse(body.translate) : []
        } as SubcategoryDto;

        console.log('Subcategory data for service:', JSON.stringify(subcategoryData, null, 2));
        
        return await this.categoriesService.createSubcategory(subcategoryData);
    }

    @Post('/subcategory/create-with-existing-image')
    public async createSubcategoryWithExistingImage(
        @Body() body: SubcategoryWithExistingImageDto,
        @Req() req: Request
    ) {
        console.log('=== Создание подкатегории с существующим изображением ===');
        console.log('Received body:', body);

        let imageUrl = '';
        if (body.existing_file_id) {
            // Получаем информацию о файле из архива
            const file = await this.uploadService.getFileById(body.existing_file_id);
            if (file) {
                imageUrl = file.url;
                console.log('Using existing image:', imageUrl);
            } else {
                throw new Error(`Файл с ID ${body.existing_file_id} не найден в архиве`);
            }
        }

        // Создаем данные для подкатегории
        const subcategoryData = {
            image: imageUrl,
            parent_uid: body.parent,
            translate: body.translate
        } as SubcategoryDto;

        console.log('Subcategory data for service:', JSON.stringify(subcategoryData, null, 2));
        
        return await this.categoriesService.createSubcategory(subcategoryData);
    }

    @Delete(':id')
    public async deleteCategory(@Param('id') id: string) {
        return await this.categoriesService.deleteCategory(id);
    }

    @Put('/subcategory/:id')
    public async updateSubcategory(
        @Param('id') id: string,
        @Body() updateSubcategoryDto: UpdateSubcategoryDto,
    ) {
        return await this.categoriesService.updateSubcategory(id, updateSubcategoryDto);
    }

    @Put('/subcategory-with-image/:id')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const timestamp = Date.now();
                    const randomNum = Math.round(Math.random() * 1e9);
                    const extension = file.originalname.split('.').pop();
                    const filename = `${timestamp}-${randomNum}.${extension}`;
                    cb(null, filename);
                },
            }),
            fileFilter: (req, file, cb) => {
                const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (allowedMimeTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Только изображения разрешены!'), false);
                }
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    )
    public async updateSubcategoryWithImage(
        @Param('id') id: string,
        @UploadedFile() image: Express.Multer.File,
        @Body() updateSubcategoryDto: UpdateSubcategoryDto,
        @Req() req: Request
    ) {
        if (image) {
            const imageUrl = this.uploadService.generateFileUrl(image.filename, req);
            updateSubcategoryDto.image = imageUrl;
        }
        return await this.categoriesService.updateSubcategory(id, updateSubcategoryDto);
    }

    // Удаление подкатегории
    @Delete('/subcategory/:id')
    public async deleteSubcategory(@Param('id') id: string) {
        return await this.categoriesService.deleteSubcategory(id);
    }

    @Get('/subcategories')
    public async getAllSubcategories() {
        return await this.categoriesService.getAllSubcategories();
    }
    @Get('/subcategory/:uuid')
    public async getSubcategory(@Param('uuid') uuid: string) {
        console.log("id", uuid);
        return await this.categoriesService.getSubcategory(uuid);
    }
}
