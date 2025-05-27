import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { CreateSlideDto } from './dto/create-slide.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { Slide } from './entities/slide.entity';

@Controller('slides')
export class SlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  @Post()
  create(@Body() createSlideDto: CreateSlideDto) {
    return this.slidesService.create(createSlideDto);
  }

  @Post('reorder')
  async reorder(@Body() body: { orderedIds: number[] }) {
      const updates = await this.slidesService.updateOrder(body.orderedIds)
      await Promise.all(updates);
      return { success: true };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Slide>) {
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
