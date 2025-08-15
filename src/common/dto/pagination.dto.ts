import { Type } from 'class-transformer';

export class PaginationDto<T> {
  data: T[];

  total: number;

  page: number;

  limit: number;

  totalPages: number;

  hasNext: boolean;

  hasPrevious: boolean;
}

export class PaginationMetaDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}