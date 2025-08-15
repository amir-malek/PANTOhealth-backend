export class SendResponseDto {
  success: boolean;
  message: string;
  dataSize?: number;
}

export class BatchResponseDto {
  success: boolean;
  sent: number;
  failed: number;
}