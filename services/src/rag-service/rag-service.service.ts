/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Get, Injectable, PreconditionFailedException } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { EmbedResponse, Message, Ollama } from 'ollama';
import * as crypto from 'crypto';
import Tesseract from "tesseract.js";
import { match } from 'assert';


@Injectable()
export class RagService {
    private readonly _QdrantClient: QdrantClient;
    private readonly _Ollama: Ollama;
    constructor(){
        this._QdrantClient = new QdrantClient({ 
            url: process.env.QDRANT_URL ?? 'http://localhost:6333',
        });

        this._Ollama = new Ollama({
            host: process.env.OLLAMA_URL ?? 'http://localhost:11434'
        });
    }

    async createCollection(): Promise<string>{
        try{
            await this._QdrantClient.createCollection('receipt_collection',{
                vectors: {
                    size: 768,
                    distance: 'Cosine',
                }
            })
            return 'Collection created successfully';
        }catch(err){
            return `Error creating collection: ${err}`;
        }
    }

    async checkQdrantCollection(): Promise<JSON>{
        try{
            const tesColl = await this._QdrantClient.getCollection('receipt_collection');
            return JSON.parse(JSON.stringify(tesColl));
        }catch(error){
            throw new Error(JSON.parse(`${(error as Error).message}`));
        }
    }

    async extractTextFromImage(image: Buffer): Promise<string> {
        try {
            const { data: { text } } = await Tesseract.recognize(image, "eng", {
                // logger: m => console.log(m.status, m.progress) 
            });
            return text;
        } catch (error) {
            throw new Error(`OCR failed: ${(error as Error).message}`);
        }
    }


    async upsertCollection(base64: Buffer): Promise<void>{
        try{
            const extractUseTesseract = await this.extractTextFromImage(base64);
            const SytemPrompt = process.env.SYSTEM_PROMPT ?? 'Extract food receipt includes the food items, prices, currency, store name or location, do not add unrelevant data, and date the receipt was taken. Output ONLY valid JSON in this format: { \"store\": \"\", \"currency\": \"\", \"date\": \"YYYY-MM-DDTHH:mm:ss\", \"items\": [{\"name\": \"\", \"price\": 0.0}] }. For example : {"store":"143 DOTY CIRCLE","currency":"USD","date":"2023-06-09T13:30:15","items":[{"name":"1 SODA","price":2.5},{"name":"1 LEMONADE, ICED","price":2.5},{"name":"1 ROAST CHICKEN","price":4.75},{"name":"1 ROOT BEER","price":3.5},{"name":"1 TEA BREWED ICE COLD","price":1.25},{"name":"1 PEPSI, ICED","price":1.75}]}';
            const computerVision = await this._Ollama.generate({
                model: 'gemma3:latest',
                prompt: extractUseTesseract,
                system: SytemPrompt,
                // images: [base64],
                stream: false,
                format: 'json'
            })

            const extractResult = JSON.parse(computerVision.response); 
            const getID = `Id-${extractResult.store}-${extractResult.date}-${extractResult.currency}`;
            const batchIndex =  await this.GetVector(computerVision.response);

            if(await this._QdrantClient.collectionExists('receipt_collection')){
                await this._QdrantClient.upsert('receipt_collection', {
                    wait: true,
                    points: [
                        {
                            id: crypto.createHash('md5').update(getID).digest('hex'),
                            vector: batchIndex.embeddings[0],
                            payload: extractResult
                        }
                        
                    ]
                })
            }else {
                await this.createCollection();
                await this.upsertCollection(base64);
            }

        }catch(err){
            console.error('Error upserting collection:', err);
        }

    }

    async GetVector(input: string): Promise<EmbedResponse>{
        try{
            return await this._Ollama.embed({
                model: 'embeddinggemma:latest ',
                input: input
            });
        }catch(err){
            console.error('Error getting vector:', err);
            throw err;
        }
    }

    async SearchSpecificQuery(query: string, dateBefore: Date) : Promise<string>{
        try{
            const batchIndex = await this.GetVector(query);
            const runQuery =  await this._QdrantClient.query('receipt_collection', {
                query: batchIndex.embeddings[0],
                filter: {
                    must: [{ key: "date", match: {value: dateBefore.toISOString() ?? new Date().toISOString()} }]
                },
                limit: 5,
                with_payload: true,
                with_vector: true
            })
            const data = runQuery.points.map(p => p.payload);
            return JSON.stringify(data);
        }catch(err){
            console.error('Error searching query:', err);
            return 'failed searchQdrant';
        }
    }

    async SearchQuery(query: string, dateBefore?: string, dateAfter?: string) : Promise<string>{
        try{
            let runQuery;
            if(dateBefore == undefined || dateAfter == undefined){
                const batchIndex = await this.GetVector(query);
                runQuery =  await this._QdrantClient.query('receipt_collection', {
                    query: batchIndex.embeddings[0],
                    limit: 5,
                    with_payload: true,
                    with_vector: true
                })
            }else{
                runQuery =  await this._QdrantClient.scroll('receipt_collection', {
                    filter: {
                        must: [
                            { key: "date", range: { 
                                gte: dateBefore, 
                                lte: dateAfter
                            }}
                        ]
                    },
                    limit: 10,
                    with_payload: true,
                    with_vector: true
                })
            }
            const data = runQuery.points.map(p => p.payload);
            return JSON.stringify(data);
        }catch(err){
            console.error('Error searching query:', err);
            return 'failed searchQdrant';
        }
    }

    
    async askAgent(userQuestion: string) {
        const tools = [
            {
                type: 'function',
                function: {
                    name: 'find_receipt_withrange',
                    description: 'Get all meal history information within a specific time range. Use this for questions that mentioned time constraint "what food i ate from 20 june until 27 june", "how much i spend between 28 December and 31st December this year", "what i eat last week?", "give my total expense for food yesterday"',
                    parameters: {
                        type: 'object',
                        required: [ 'dateStart', 'dateEnd'],
                        properties: {
                            dateStart: { type: 'string', description: `The latest date or time in (YYYY-MM-DDTHH:mm) RFC3339 format WITHOUT TIMEZONE OFFSET, used as time range of food history findings. Use current date to calculate time constraint: ${new Date().toISOString()}`},
                            dateEnd: { type: 'string', description: `The last date or time in (YYYY-MM-DDTHH:mm) RFC3339 format WITHOUT TIMEZONE OFFSET, used as time range of food history findings. Use current date to calculate time constraint: ${new Date().toISOString()}`},
                        },
                    },
                },
            },
            // {
            //     type: 'function',
            //     function: {
            //         name: 'find_receipt_specific',
            //         description: 'Get all meal history information from receipt uploaded with or without specific date or time. Use this for questions like "what is all my expense?", "what i ate yesterday?", "what meal i ate recently?", "how many receipt fo i have?", "what is the total spending of my latest purchases?"',
            //         parameters:{
            //             type: 'object',
            //             required: [],
            //             properties: {
            //                 a: { type: 'string', description: `The date or time in (YYYY-MM-DDTHH:mm) RFC3339 format, used as specific time of food history findings. Use current date to calculate time constraint: ${new Date().toISOString()}`},
            //                 b: { type: 'string', description: `This tool is not used.`}
            //             },
            //         }
            //     },
            // },
        ]

        const messages : Message [] = [
            { role: 'system', content: `You are a Meal Purchases Assistant that helps users retrieve and analyze their food receipt information in the past, meal data, total meal expenses, and eating history from uploaded receipts. Your goal is to provide direct and factual answers based on the user's query.
Your Capabilities:
- Answer questions about food purchases, expenses, items, and locations.
- Use available tools to retrieve accurate data before answering.
- Identify the number of food purchased and its name.
- Identify where (store/restaurant/location) food was purchased.
- Calculate total spending and expenses related to food bought by sum all the food prices including the decimal.
- ALWAYS USE CURRENT DATE AND TIME ${new Date().toISOString()} in (YYYY-MM-DDTHH:mm) RFC3339 format WITHOUT TIMEZONE OFFSET to calculate the time constraint.

Tool Usage:
1. Always use 'find_receipt_withrange' tool when the query includes date range or specific time constraint like 'between last 20th June and now', 'from 24th december 2022 until 31st december 2022', 'last week until now', 'yesterday', 'last week', 'today', 'last 20th', 'October 23rd 2020', etc. :
    - Always understand and analyze the specific time constraint in the user query.
    - Always calculate the dateStart and dateEnd correctly based on Today's Date (YYYY-MM-DDTHH:mm): ${new Date().toISOString()}.
    - dateStart is the time range start, use 00:00:01 for the hours if not specify.
    - dateEnd is the time range end, use 23:59:59 for the hours if not specify.
    - Response using the data clearly using markdown.` },
            { role: 'user', content: userQuestion }
        ];

        try{
            const initialResponse = await this._Ollama.chat({
                model: 'llama3.2:latest',
                messages: messages,
                tools,
                // think: true  
            });
            messages.push(initialResponse.message);

            if (initialResponse.message.tool_calls && initialResponse.message.tool_calls.length > 0) {
                
                for (const toolCall of initialResponse.message.tool_calls) {
                    
                    let funcResult: string = '';
                    if (toolCall.function.name === 'find_receipt_withrange') {
                        const arg = toolCall.function.arguments as { dateStart : string , dateEnd : string};
                        funcResult = await this.SearchQuery(userQuestion, arg.dateStart, arg.dateEnd);
                    } 
                    // else if (toolCall.function.name === 'find_receipt_specific') {
                    //     const arg = toolCall.function.arguments as { a : string};
                    //     funcResult = await this.SearchSpecificQuery(userQuestion, new Date(arg.a));
                    // }
                    else{
                        funcResult = 'unknown tool';
                    }

                    messages.push({
                        role: 'tool',
                        tool_name : toolCall.function.name,
                        content: funcResult,                     
                    });
                }
                const finalResponse = await this._Ollama.chat({
                    model: 'llama3.2:latest',
                    messages: messages,
                    tools,
                });

                return finalResponse.message.content; 
            }
            return initialResponse.message.content;
        }catch(err){
            console.error('Error asking agent:', err);
        }
    
    }
}
