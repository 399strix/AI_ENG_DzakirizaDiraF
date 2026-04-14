export class ExtractionOutputDto {
  store: string;
  currency: string;
  date: string;
  items: ReceiptItemDto[];
}

export class ReceiptItemDto {
  name: string;
  price: number;
}

export class UserMessage{
    input: string;
}