/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import csv from 'csv-parser';
import { CsvResultDto } from './csvFile.dto';

@Injectable()
export class CsvextractionService {
  private readonly _csvResult: CsvResultDto[] = [];

  async recieveFile(file: NodeJS.ReadableStream): Promise<void> {
    const req = new Promise((resolve, reject) => {
      file.pipe(csv()).on('data', (data) => {
        const customer: CsvResultDto = {
          index: data['Index'],
          customerId: data['Customer Id'],
          firstName: data['First Name'],
          lastName: data['Last Name'],
          company: data['Company'],
          city: data['City'],
          country: data['Country'],
          phone1: data['Phone 1'],
          phone2: data['Phone 2'],
          email: data['Email'],
          subscriptionDate: data['Subscription Date'],
          website: data['Website'],
        };
        // const val = data['ColumnName'];
        if (data) console.log(data);
      });
      file.on('end', () => {
        console.log('done parsing');
        resolve({ message: 'done parsing' });
      });
      file.on('error', reject);
    });
  }

}