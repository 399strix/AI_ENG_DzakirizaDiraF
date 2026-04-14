/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Get, Injectable, PreconditionFailedException } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { EmbedResponse, Message, Ollama } from 'ollama';
import * as crypto from 'crypto';
import Tesseract from "tesseract.js";


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
            }else await this.createCollection();

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

    async SearchQuery(query: string, dateBefore?: Date, dateAfter?: Date) : Promise<string>{
        try{
            const batchIndex = await this.GetVector(query);
            let runQuery;
            if(dateBefore == undefined || dateAfter == undefined){
                runQuery =  await this._QdrantClient.query('receipt_collection', {
                    query: batchIndex.embeddings[0],
                    limit: 10,
                    with_payload: true,
                    with_vector: true
                })
            }else{
                runQuery =  await this._QdrantClient.query('receipt_collection', {
                    query: batchIndex.embeddings[0],
                    filter: {
                        must: [{ key: "date", range: { 
                            gte: dateBefore ?? new Date().setDate(new Date().getDate()-1), 
                            lte: dateAfter ?? new Date().toISOString()
                        } }]
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
                name: 'find_receipt_information',
                description: 'Get all food receipt information within a specific date range from receipt uploaded. Use this for questions like "what i ate yesterday?", "what food i ate from 20 june until 27 june", "how much i spend in 31st December This month", "what i eat last week?"',
                parameters: {
                    type: 'object',
                    required: [],
                    properties: {
                        startDate: { type: 'string', description: `Oldest date or time of the food receipt in (YYYY-MM-DDTHH:mm) RFC3339 format, used for searching specific food purchases by the date or time. Use current date if neccessary ${new Date().toISOString()}`},
                        endDate: { type: 'string', description: `Recent date or time of the food receipt in (YYYY-MM-DDTHH:mm) RFC3339 format, used for searching specific food purchases by the date or time. Use current date if neccessary ${new Date().toISOString()}`},
                    },
                },
                },
            },
            {
                type: 'function',
                function: {
                    name: 'find_receipt_withoutdate',
                    description: 'Get all food receipt information from receipt uploaded. Use this for questions like "what is all my expense?", "what food i ate recently?", "how many receipt fo i have?", "what is the total spending of my purchases?"',
    
                },
            },
        ]

        const messages : Message [] = [
            { role: 'system', content: `You are a Food Receipt Assistant that helps users retrieve and analyze their food purchase history, receipt data, and eating history from uploaded receipts. Your goal is to provide direct and factual answers based on the user's uploaded receipt data.
Your Capabilities:
- Answer questions about food purchases, expenses, items, and locations.
- Use available tools to retrieve accurate data before answering.
- Identify the number of food purchased and its name.
- Calculate date ranges dynamically based on Today's Date : ${new Date().toISOString()}.
- Identify where (store/restaurant/location) food was purchased.
- Calculate spending and expenses related to food bought.

Tool Usage:
1. Use 'find_receipt_information' when the query includes any time constraint like yesterday, 20th June, 31st december 2022, last week:
    - Understand and analyze the specific date or time.
    - Summarize the startDateTime and endDateTime for time range.
    - Response using the data clearly using markdown.
    
2. Use 'find_receipt_withoutdate' when the query not includes any time constraint, like recently, lately:
    - Analyze user query.
    - Summarize the data clearly using makrdown.` },
            { role: 'user', content: userQuestion }
        ];

        try{
            const initialResponse = await this._Ollama.chat({
                model: 'llama3.2:latest',
                messages: messages,
                tools: tools,
                // think: true  
            });
            messages.push(initialResponse.message);

            if (initialResponse.message.tool_calls && initialResponse.message.tool_calls.length > 0) {
                
                for (const toolCall of initialResponse.message.tool_calls) {
                    
                    let funcResult: string = '';
                    if (toolCall.function.name === 'find_receipt_information') {
                        const arg = toolCall.function.arguments as { startDate : string , endDate : string};
                        funcResult = await this.SearchQuery(userQuestion, new Date(arg.startDate), new Date(arg.endDate));
                    } 
                    else if (toolCall.function.name === 'find_receipt_withoutdate') {
                        funcResult = await this.SearchQuery(userQuestion);
                    }
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
