import { Injectable } from '@nestjs/common';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class UploadService {
  private readonly uploadPath = './uploads';

  constructor() {
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
