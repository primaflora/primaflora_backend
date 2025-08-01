import { Module } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { SlidesController } from './slides.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Slide } from './entities/slide.entity';
import { UploadModule } from 'src/upload/upload.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Slide]),
        UploadModule
    ],
    controllers: [SlidesController],
    providers: [SlidesService],
})
export class SlidesModule {}
