import {
  IsString,
  IsNumber,
  IsDate,
  IsObject,
  IsOptional,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CoordinatesDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class CreateSignalDto {
  @IsString()
  deviceId: string;

  @Type(() => Date)
  @IsDate()
  time: Date;

  @IsInt()
  @Min(0)
  dataLength: number;

  @IsInt()
  @Min(0)
  dataVolume: number;

  @IsNumber()
  avgSpeed: number;

  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  minCoordinates: CoordinatesDto;

  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  maxCoordinates: CoordinatesDto;

  @IsOptional()
  @IsObject()
  rawData?: any;
}
