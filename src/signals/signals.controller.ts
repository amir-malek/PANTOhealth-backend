import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Put,
} from '@nestjs/common';
import { SignalsService } from './signals.service';
import { CreateSignalDto } from './dto/create-signal.dto';
import { UpdateSignalDto } from './dto/update-signal.dto';
import { FilterSignalDto } from './dto/filter-signal.dto';
import { PaginatedSignalDto, SignalResponseDto } from './dto/paginated-signal.dto';
import { DeviceStatsDto } from './dto/device-stats.dto';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('signals')
@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new signal' })
  @ApiResponse({ 
    status: 201, 
    description: 'Signal created successfully',
    type: SignalResponseDto 
  })
  create(@Body(ValidationPipe) createSignalDto: CreateSignalDto): Promise<SignalResponseDto> {
    return this.signalsService.create(createSignalDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all signals with pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns paginated list of signals',
    type: PaginatedSignalDto 
  })
  findAll(@Query(ValidationPipe) filterDto: FilterSignalDto): Promise<PaginatedSignalDto> {
    return this.signalsService.findAll(filterDto);
  }

  @Get('filter')
  @ApiOperation({ summary: 'Advanced filtering for signals' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns filtered and paginated signals',
    type: PaginatedSignalDto 
  })
  filterSignals(@Query(ValidationPipe) filterDto: FilterSignalDto): Promise<PaginatedSignalDto> {
    return this.signalsService.findAll(filterDto);
  }

  @Get('stats/:deviceId')
  @ApiOperation({ summary: 'Get device statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns aggregated statistics for a device',
    type: DeviceStatsDto 
  })
  getDeviceStatistics(@Param('deviceId') deviceId: string): Promise<DeviceStatsDto> {
    return this.signalsService.getDeviceStatistics(deviceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a signal by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a single signal',
    type: SignalResponseDto 
  })
  findOne(@Param('id') id: string): Promise<SignalResponseDto> {
    return this.signalsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateSignalDto: UpdateSignalDto,
  ): Promise<SignalResponseDto> {
    return this.signalsService.update(id, updateSignalDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.signalsService.remove(id);
  }
}
