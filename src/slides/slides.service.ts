import { Injectable } from '@nestjs/common';
import { CreateSlideDto } from './dto/create-slide.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Slide } from './entities/slide.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SlidesService {
    constructor(
        @InjectRepository(Slide)
        private slidesRepository: Repository<Slide>,
    ) {}
    findAll() {
        return this.slidesRepository.find();
    }

    create(dto: CreateSlideDto) {
        const slide = this.slidesRepository.create(dto);
        return this.slidesRepository.save(slide);
    }

    remove(id: number) {
        return this.slidesRepository.delete(id);
    }
}
