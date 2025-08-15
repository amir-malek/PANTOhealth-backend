import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProducerService } from './producer.service';
import { SendResponseDto, BatchResponseDto } from './dto/send-response.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('producer')
@Controller('producer')
export class ProducerController {
  constructor(private readonly producerService: ProducerService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendSampleData(): Promise<SendResponseDto> {
    return this.producerService.sendSampleData();
  }

  @Post('send-custom')
  @HttpCode(HttpStatus.OK)
  async sendCustomData(@Body() data: unknown): Promise<SendResponseDto> {
    return this.producerService.sendCustomData(data);
  }

  @Post('send-batch')
  @HttpCode(HttpStatus.OK)
  async sendBatchData(
    @Query('count') count?: string,
    @Query('delayMs') delayMs?: string,
  ): Promise<BatchResponseDto> {
    const messageCount = count ? parseInt(count, 10) || 10 : 10;
    const delay = delayMs ? parseInt(delayMs, 10) || 1000 : 1000;

    return this.producerService.sendBatchData(messageCount, delay);
  }
}
