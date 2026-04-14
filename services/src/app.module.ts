import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CsvextractionController } from './csvextraction/csvextraction.controller';
import { CsvextractionService } from './csvextraction/csvextraction.service';
import { RagServiceController } from './rag-service/rag-service.controller';
import { RagService } from './rag-service/rag-service.service';

@Module({
  imports: [],
  controllers: [AppController, CsvextractionController, RagServiceController],
  providers: [AppService, CsvextractionService, RagService],
})
export class AppModule {}
