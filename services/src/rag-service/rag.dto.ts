export interface ExtractionOutputDto {
  store: string;
  currency: string;
  date: string;
  items: ReceiptItemDto[];
}

export interface ReceiptItemDto {
  name: string;
  price: number;
}

export interface UserMessage{
    input: string;
}