import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { CreateSlideDto } from './dto/create-slide.dto';
import { CreateSlideWithExistingImageDto } from './dto/create-slide-with-existing-image.dto';
import { UpdateSlideWithExistingImageDto } from './dto/update-slide-with-existing-image.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { Slide } from './entities/slide.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UploadService } from 'src/upload/upload.service';

@Controller('slides')
export class SlidesController {
  constructor(
    private readonly slidesService: SlidesService,
    private readonly uploadService: UploadService
  ) {}

  @Post()
  create(@Body() createSlideDto: CreateSlideDto) {
    return this.slidesService.create(createSlideDto);
  }

  @Post('create-with-image')
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
  createWithImage(
    @UploadedFile() image: Express.Multer.File,
    @Body() createSlideDto: CreateSlideDto,
    @Req() req: any
  ) {
    if (image) {
      const imageUrl = this.uploadService.generateFileUrl(image.filename, req);
      createSlideDto.imageUrl = imageUrl;
    }
    return this.slidesService.create(createSlideDto);
  }

  @Post('create-with-existing-image')
  async createSlideWithExistingImage(
    @Body() body: CreateSlideWithExistingImageDto,
    @Req() req: any
  ) {
    console.log('=== Создание слайда с существующим изображением ===');
    console.log('Received body:', body);
    console.log('existing_file_id:', body.existing_file_id);
    console.log('All body properties:', Object.keys(body));

    let imageUrl = '';
    if (body.existing_file_id) {
      console.log('Searching for file with ID:', body.existing_file_id);
      // Получаем информацию о файле из архива
      const file = await this.uploadService.getFileById(body.existing_file_id);
      if (file) {
        imageUrl = file.url;
        console.log('Using existing image:', imageUrl);
      } else {
        throw new Error(`Файл с ID ${body.existing_file_id} не найден в архиве`);
      }
    } else {
      console.log('No existing_file_id provided');
    }

    // Создаем данные для слайда
    const slideData: CreateSlideDto = {
      imageUrl: imageUrl,
      title: body.title || '',
      link: body.link || '',
      textColor: body.textColor || '',
      isActive: true, // По умолчанию активный
    };

    console.log('Slide data for service:', JSON.stringify(slideData, null, 2));
    
    return this.slidesService.create(slideData);
  }

  @Post('reorder')
  async reorder(@Body() body: { orderedIds: number[] }) {
      const updates = await this.slidesService.updateOrder(body.orderedIds)
      await Promise.all(updates);
      return { success: true };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Slide> & { existing_file_id?: string }) {
    const { existing_file_id, ...rest } = body;
    // Если нет ни одного поля для обновления, возвращаем текущий слайд
    if (Object.keys(rest).length === 0) {
      return this.slidesService.findAll().then(slides => slides.find(s => s.id === +id));
    }
    return this.slidesService.update(+id, rest);
  }

  @Patch(':id/update-with-existing-image')
  async updateWithExistingImage(
    @Param('id') id: string,
    @Body() body: UpdateSlideWithExistingImageDto,
    @Req() req: any
  ) {
    console.log('=== Обновление слайда с существующим изображением ===');
    console.log('Slide ID:', id);
    console.log('Received body:', body);

    if (!body.existing_file_id) {
      throw new Error('Не передан existing_file_id');
    }

    try {
      const file = await this.uploadService.getFileById(body.existing_file_id);
      if (!file) {
        throw new Error(`Файл с ID ${body.existing_file_id} не найден в архиве`);
      }

      // Подготавливаем данные для обновления
      const updateData: Partial<Slide> = {
        imageUrl: file.url,
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.link !== undefined && { link: body.link }),
        ...(body.textColor !== undefined && { textColor: body.textColor }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      };

      console.log('Update data for service:', JSON.stringify(updateData, null, 2));
      
      return this.slidesService.update(+id, updateData);
    } catch (error) {
      console.error('Error updating slide with existing image:', error);
      throw error;
    }
  }

  @Patch('update-with-image/:id')
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
  async updateWithImage(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File,
    @Body() body: Partial<Slide>,
    @Req() req: any
  ) {
    if (image) {
      const imageUrl = this.uploadService.generateFileUrl(image.filename, req);
      body.imageUrl = imageUrl;
    }
    return this.slidesService.update(+id, body);
  }

  @Get()
  findAll() {
    return this.slidesService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.slidesService.remove(+id);
  }
}
