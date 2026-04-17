/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { RagService } from './rag-service.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { UserMessage } from './rag.dto';

@Controller('rag-service')
export class RagServiceController {
    private readonly _RagServices: RagService;
    constructor(ragService: RagService) {
        this._RagServices = ragService;
    }

    @Post('find-query')
    async extract(@Body() query: UserMessage): Promise<JSON> {
        if(query == undefined) return JSON.parse(JSON.stringify({message: 'no input'}));
        const result = await this._RagServices.askAgent(query.input);
        return JSON.parse(JSON.stringify({message: 'This is the response from RAG service', result}));
    }    

    @Post('create-collection')
    async createCollection(@Req() collectionData: Request): Promise<JSON> {
        const result = await this._RagServices.createCollection();
        return JSON.parse(JSON.stringify({message: 'Collection created successfully', hasil: result}));
    }
    
    @Post('upsert-collection')
    @UseInterceptors(FileInterceptor('file'))
    async upsertCollection(@UploadedFile() file: Express.Multer.File): Promise<void> {
        await this._RagServices.upsertCollection(file.buffer);
    }
}
