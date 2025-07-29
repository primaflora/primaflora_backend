import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { FileEntity } from '../entity/file.entity';

@Injectable()
export class UploadService {
  private readonly uploadPath = './uploads';

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {
    // Создаем папку uploads, если её нет
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Генерирует уникальное имя файла
   */
  generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const extension = extname(originalName);
    return `${timestamp}-${randomNum}${extension}`;
  }

  /**
   * Возвращает путь к папке загрузок
   */
  getUploadPath(): string {
    return this.uploadPath;
  }

  /**
   * Генерирует URL для доступа к файлу
   */
  generateFileUrl(filename: string, req?: any): string {
    const baseUrl = req ? `${req.protocol}://${req.get('host')}` : '';
    return `${baseUrl}/uploads/${filename}`;
  }

  /**
   * Проверяет является ли файл изображением
   */
  isImage(file: Express.Multer.File): boolean {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedMimeTypes.includes(file.mimetype);
  }

  /**
   * Сохраняет информацию о загруженном файле в архив
   */
  async saveFileToArchive(
    file: Express.Multer.File, 
    filename: string, 
    req?: any,
    description?: string,
    tags?: string[]
  ): Promise<FileEntity> {
    const url = this.generateFileUrl(filename, req);
    const path = `${this.uploadPath}/${filename}`;

    const fileEntity = this.fileRepository.create({
      original_name: file.originalname,
      filename: filename,
      path: path,
      url: url,
      mimetype: file.mimetype,
      size: file.size,
      description: description || null,
      tags: tags || [],
    });

    return await this.fileRepository.save(fileEntity);
  }

  /**
   * Получает все файлы из архива
   */
  async getArchiveFiles(
    page: number = 1, 
    limit: number = 20,
    searchTerm?: string,
    tags?: string[]
  ): Promise<{ files: FileEntity[], total: number, pages: number }> {
    const queryBuilder = this.fileRepository.createQueryBuilder('file');

    if (searchTerm) {
      queryBuilder.where(
        '(file.original_name ILIKE :searchTerm OR file.description ILIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` }
      );
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('file.tags && :tags', { tags });
    }

    queryBuilder
      .orderBy('file.uploaded_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [files, total] = await queryBuilder.getManyAndCount();
    const pages = Math.ceil(total / limit);

    return { files, total, pages };
  }

  /**
   * Получает файл по ID
   */
  async getFileById(id: string): Promise<FileEntity> {
    return await this.fileRepository.findOne({ where: { uuid: id } });
  }

  /**
   * Обновляет информацию о файле (описание, теги)
   */
  async updateFileInfo(id: string, description?: string, tags?: string[]): Promise<FileEntity> {
    await this.fileRepository.update(id, {
      description: description,
      tags: tags,
    });
    return await this.getFileById(id);
  }

  /**
   * Фильтр для загрузки только изображений
   */
  imageFileFilter = (req: any, file: any, callback: Function) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Только изображения разрешены!'), false);
    }
  };
}
