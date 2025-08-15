import { Signal } from '../schemas/signal.schema';

export class SignalResponseDto {
  _id: string;
  deviceId: string;
  time: Date;
  dataLength: number;
  dataVolume: number;
  avgSpeed: number;
  minCoordinates: {
    x: number;
    y: number;
  };
  maxCoordinates: {
    x: number;
    y: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export class PaginatedSignalDto {
  data: SignalResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}