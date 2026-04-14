import { Test, TestingModule } from '@nestjs/testing';
import { RagServiceController } from './rag-service.controller';

describe('RagServiceController', () => {
  let controller: RagServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagServiceController],
    }).compile();

    controller = module.get<RagServiceController>(RagServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
