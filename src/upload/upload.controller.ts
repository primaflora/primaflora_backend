import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UploadService } from './upload.service';
import { GetArchiveFilesDto, UpdateFileInfoDto, UploadWithArchiveDto } from './dto/archive.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, './uploads');
        },
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
  async uploadImage(
    @UploadedFile() file: Express.Multer.File, 
    @Req() req: any,
    @Body() body?: any // Изменяем тип на any для работы с form-data
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    console.log('=== Upload Image Debug ===');
    console.log('Body:', body);
    console.log('File:', file ? { name: file.filename, size: file.size } : 'No file');

    // Парсим теги из строки JSON если они есть
    let tags: string[] = [];
    if (body?.tags) {
      try {
        tags = typeof body.tags === 'string' ? JSON.parse(body.tags) : body.tags;
      } catch (error) {
        console.error('Ошибка парсинга тегов:', error);
        tags = []; // Используем пустой массив если парсинг не удался
      }
    }

    // Сохраняем файл в архив
    const savedFile = await this.uploadService.saveFileToArchive(
      file, 
      file.filename, 
      req,
      body?.description,
      tags
    );

    return {
      message: 'Изображение успешно загружено',
      file: savedFile,
    };
  }

  @Get('archive')
  async getArchiveFiles(@Query() query: GetArchiveFilesDto) {
    return await this.uploadService.getArchiveFiles(
      query.page,
      query.limit,
      query.searchTerm,
      query.tags
    );
  }

  @Get('archive/:id')
  async getFileById(@Param('id') id: string) {
    const file = await this.uploadService.getFileById(id);
    if (!file) {
      throw new NotFoundException('Файл не найден');
    }
    return file;
  }

  @Put('archive/:id')
  async updateFileInfo(
    @Param('id') id: string,
    @Body() body: UpdateFileInfoDto
  ) {
    const file = await this.uploadService.getFileById(id);
    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    return await this.uploadService.updateFileInfo(
      id,
      body.description,
      body.tags
    );
  }

  @Delete('archive/:id')
  async deleteFile(@Param('id') id: string) {
    const file = await this.uploadService.getFileById(id);
    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    await this.uploadService.deleteFile(id);
    
    return {
      message: 'Файл успешно удален',
      deletedFileId: id
    };
  }
}
