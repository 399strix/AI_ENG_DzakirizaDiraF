/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { UseInterceptors, Controller, Post, Req, Sse } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsvextractionService } from './csvextraction.service';
// import { Buffer } from 'buffer';
import { Request } from 'express';
import { Readable } from 'stream';

@Controller('csvextraction')
export class CsvextractionController {
  private readonly _ExtractionService: CsvextractionService;
  constructor(extractionService: CsvextractionService) {
    this._ExtractionService = extractionService;
  }

  // @Post()
  // @UseInterceptors(FileInterceptor('file'))
  // async extract(@Req() file: Express.Multer.File): Promise<void> {
  //   // await this._ExtractionService.recieveFile(file);
  //   // const rawData = file.body; // Assuming the file is sent in the request body
  // //   const req = new Promise((resolve, reject) => {
  // //     let size = 0;

  // //     file.on('data', (chunk) => {
  // //       size += chunk.length;

  // //       // 🔥 process chunk here
  // //       console.log('Chunk received:', chunk.length);
  // //     });

  // //     file.on('end', () => {
  // //       console.log('Upload complete:', size);
  // //       resolve({ size });
  // //     });

  // //     file.on('error', reject);
  // //   });
  // }
  // return json.stringify({Body: result});
    @Sse()
    async streamData(): Promise<Readable> {
      const stream = new Readable();
      stream.push('Hello, this is a stream of data!');
      stream.push(null);
      return stream;
    }
}