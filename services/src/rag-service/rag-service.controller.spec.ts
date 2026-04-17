import { Test, TestingModule } from '@nestjs/testing';
import { RagServiceController } from './rag-service.controller';
import { RagService } from './rag-service.service';

describe('RagServiceController', () => {
  let controller: RagServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagServiceController],
      providers: [RagService],
    }).compile();

    controller = module.get<RagServiceController>(RagServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

});
