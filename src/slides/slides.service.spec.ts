import { Test, TestingModule } from '@nestjs/testing';
import { SlidesService } from './slides.service';

describe('SlidesService', () => {
  let service: SlidesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlidesService],
    }).compile();

    service = module.get<SlidesService>(SlidesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
