import { Test, TestingModule } from '@nestjs/testing';
import { CsvextractionService } from './csvextraction.service';

describe('CsvextractionService', () => {
  let service: CsvextractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsvextractionService],
    }).compile();

    service = module.get<CsvextractionService>(CsvextractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
