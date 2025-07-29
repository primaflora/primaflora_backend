import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, UsePipes, UseInterceptors, UploadedFile, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { CreateCommentDto } from './dto/create-comment';
import { ProductsService } from './products.service';
import { TokenService } from 'src/token/token.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductWithImageDto } from './dto/create-product-with-image.dto';
import { CreateProductWithExistingImageDto } from './dto/create-product-with-existing-image.dto';
import { ValidateLanguagePipe } from 'src/common/pipes/accept-language.pipe';
import { AcceptLanguage } from 'src/common/decorators/accept-language.decorator';
import { Role } from 'src/common/decorators/role.decorator';
import { EUserRole } from 'src/enum/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UploadService } from 'src/upload/upload.service';

@Controller('products')
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly tokenService: TokenService,
        private readonly uploadService: UploadService
    ) {}

    @Get('/getAll')
    @UsePipes(new ValidateLanguagePipe())
    findAll(@AcceptLanguage() language: string, @Req() req: Request) {
        const token = req.headers['authorization']?.split(' ')[1];
        console.log("TOKEN", token)
        return this.productsService.getAll(language, token);
    }

    @Get('/getPaginated')
    @UsePipes(new ValidateLanguagePipe())
    getPaginated(@AcceptLanguage() language: string, @Body() pagination: number,@Req() req: Request){
        const token = req.headers['authorization']?.split(' ')[1];
        return this.productsService.getPaginated(pagination, token);
    }

    @Post('/create')
    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
    createProduct(@Body() createProductDto: Omit<CreateProductDto, 'rating'>) {
        return this.productsService.create(createProductDto);
    }

    @Post('/create-with-image')
    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
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
    createProductWithImage(
        @UploadedFile() image: Express.Multer.File,
        @Body() body: any,
        @Req() req: Request
    ) {
        console.log('=== Создание продукта с изображением ===');
        console.log('Received raw body:', body);
        console.log('Received file:', image ? { 
            filename: image.filename, 
            size: image.size, 
            mimetype: image.mimetype 
        } : 'No file');
        
        // Преобразуем данные вручную
        let photo_url = '';
        if (image) {
            photo_url = this.uploadService.generateFileUrl(image.filename, req);
            console.log('Generated image URL:', photo_url);
        }
        
        // Парсим данные из form-data
        const productData: Omit<CreateProductDto, 'rating'> = {
            photo_url: photo_url,
            price_currency: parseFloat(body.price_currency) || 0,
            price_points: parseFloat(body.price_points) || 0,
            percent_discount: parseFloat(body.percent_discount) || 0,
            categoryIds: body.categoryIds ? JSON.parse(body.categoryIds) : [],
            translate: body.translate ? JSON.parse(body.translate) : [],
            descriptionPoints: body.descriptionPoints ? JSON.parse(body.descriptionPoints) : [],
            isPublished: body.isPublished === 'true' || body.isPublished === true,
        };
        
        console.log('Product data for service:', JSON.stringify(productData, null, 2));
        
        return this.productsService.create(productData);
    }

    @Post('/create-with-existing-image')
    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
    async createProductWithExistingImage(
        @Body() body: CreateProductWithExistingImageDto,
        @Req() req: Request
    ) {
        console.log('=== Создание продукта с существующим изображением ===');
        console.log('Received body:', body);
        
        let photo_url = '';
        if (body.existing_file_id) {
            // Получаем информацию о файле из архива
            const file = await this.uploadService.getFileById(body.existing_file_id);
            if (file) {
                photo_url = file.url;
                console.log('Using existing image:', photo_url);
            } else {
                throw new Error(`Файл с ID ${body.existing_file_id} не найден в архиве`);
            }
        }
        
        // Создаем данные для продукта
        const productData: Omit<CreateProductDto, 'rating'> = {
            photo_url: photo_url,
            price_currency: body.price_currency,
            price_points: body.price_points,
            percent_discount: body.percent_discount,
            categoryIds: body.categoryIds, // Уже преобразованы в DTO
            translate: body.translate,
            descriptionPoints: body.descriptionPoints,
            isPublished: body.isPublished,
        };
        
        console.log('Product data for service:', JSON.stringify(productData, null, 2));
        
        return this.productsService.create(productData);
    }

    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
    @Post('/createComment/:productId')
    create(
        @Body() createCommentDto: CreateCommentDto,
        @Param('productId') productId: number,
        @Req() req: Request
    ) {
        const token = req.headers.authorization.replace('Bearer ', '');
        return this.productsService.createComment(
            createCommentDto,
            token,
            productId
        );
    }

    @Delete('/:uuid')
    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
    delete(@Param('uuid') uuid: string) {
        return this.productsService.delete(uuid);
    }

    @Post('/like/:productUid')
    likeProduct(@Param('productUid') productUid: string, @Req() req: Request) {
        const token = req.headers.authorization.replace('Bearer ', '');
        return this.productsService.likeProduct(productUid, token);
    }

    @Get('/getWithComments/:uuid')
    @UsePipes(new ValidateLanguagePipe())
    getComments(
        @Param('uuid') uuid: string, 
        @Req() req: Request, 
        @AcceptLanguage() language: string
    ) {
        const token = this.getTokenPayloadFromRequest(req);
        console.log('token => ', token);
        return this.productsService.getOneWithComments(uuid, language, token);
    }

    @Patch('/update/:uuid')
    @UsePipes(new ValidateLanguagePipe())
    // TODO: make for admin
    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
    update(
        @Param('uuid') uuid: string,
        @Body() updateProductDto: UpdateProductDto,
        @AcceptLanguage() language: string
    ) {
        return this.productsService.update(uuid, updateProductDto, language);
    }

    @Patch('/update-with-image/:uuid')
    @UsePipes(new ValidateLanguagePipe())
    @Role(EUserRole.ADMIN)
    @UseGuards(RolesGuard)
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
    updateWithImage(
        @Param('uuid') uuid: string,
        @UploadedFile() image: Express.Multer.File,
        @Body() updateProductDto: UpdateProductDto,
        @AcceptLanguage() language: string,
        @Req() req: Request
    ) {
        if (image) {
            const imageUrl = this.uploadService.generateFileUrl(image.filename, req);
            updateProductDto.photo_url = imageUrl;
        }
        return this.productsService.update(uuid, updateProductDto, language);
    } 

    private getTokenPayloadFromRequest(req: Request): any | null {
        if (!req.headers.authorization) {
            return null;
        }
        return req.headers.authorization.replace('Bearer ', '');

        // return this.tokenService.verifyToken(token, 'access');
    }
}
