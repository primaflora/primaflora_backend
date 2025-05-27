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

    async create(dto: CreateSlideDto) {
        const last = await this.slidesRepository
        .createQueryBuilder("slide")
        .orderBy("slide.order", "DESC")
        .getOne();

         const slide = this.slidesRepository.create({
            ...dto,
            order: last ? last.order + 1 : 1,
        });

        return this.slidesRepository.save(slide);
    }
    async updateOrder(orderedIds: number[]) {
        return orderedIds.map((id, index) =>
            this.slidesRepository.update(id, { order: index }),
        );
    }

    async update(id: number, data: Partial<Slide>) {
        await this.slidesRepository.update(id, data);
        return this.slidesRepository.findOneBy({ id });
    }
    
    remove(id: number) {
        return this.slidesRepository.delete(id);
    }
}
