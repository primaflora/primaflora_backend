import { Test, TestingModule } from '@nestjs/testing';
import { SlidesController } from './slides.controller';
import { SlidesService } from './slides.service';

describe('SlidesController', () => {
  let controller: SlidesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlidesController],
      providers: [SlidesService],
    }).compile();

    controller = module.get<SlidesController>(SlidesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
