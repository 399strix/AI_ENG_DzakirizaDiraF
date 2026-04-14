import { Test, TestingModule } from '@nestjs/testing';
import { CsvextractionController } from './csvextraction.controller';
import { CsvextractionService } from './csvextraction.service';

describe('csvextraction', () => {
  let controller: CsvextractionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CsvextractionController],
      providers: [CsvextractionService],
    }).compile();

    controller = module.get<CsvextractionController>(CsvextractionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
