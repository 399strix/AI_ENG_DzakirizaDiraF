import { Test, TestingModule } from '@nestjs/testing';
import { CsvextractionController } from './csvextraction.controller';

describe('CsvextractionController', () => {
  let controller: CsvextractionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CsvextractionController],
    }).compile();

    controller = module.get<CsvextractionController>(CsvextractionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
