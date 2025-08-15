import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, SortOrder } from 'mongoose';
import { Signal, SignalDocument } from './schemas/signal.schema';
import { CreateSignalDto } from './dto/create-signal.dto';
import { UpdateSignalDto } from './dto/update-signal.dto';
import { FilterSignalDto } from './dto/filter-signal.dto';
import { PaginatedSignalDto, SignalResponseDto } from './dto/paginated-signal.dto';
import { DeviceStatsDto } from './dto/device-stats.dto';
import { XRayMessage, ProcessedSignal, isError } from '../common/types';

@Injectable()
export class SignalsService {
  constructor(
    @InjectModel(Signal.name) private signalModel: Model<SignalDocument>,
  ) {}

  async create(createSignalDto: CreateSignalDto): Promise<SignalResponseDto> {
    try {
      const createdSignal = new this.signalModel(createSignalDto);
      const saved = await createdSignal.save();
      return saved.toObject() as SignalResponseDto;
    } catch (error) {
      const errorMessage = isError(error) ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to create signal: ${errorMessage}`);
    }
  }

  processXRayData(xrayMessage: XRayMessage): ProcessedSignal[] {
    const processedSignals: ProcessedSignal[] = [];

    for (const [deviceId, deviceData] of Object.entries(xrayMessage)) {
      if (!deviceData.data || !Array.isArray(deviceData.data)) {
        throw new BadRequestException(
          `Invalid data format for device ${deviceId}`,
        );
      }

      const dataLength = deviceData.data.length;
      const dataVolume = Buffer.byteLength(JSON.stringify(deviceData));

      let totalSpeed = 0;
      let minX = Number.MAX_VALUE;
      let minY = Number.MAX_VALUE;
      let maxX = Number.MIN_VALUE;
      let maxY = Number.MIN_VALUE;

      for (const dataPoint of deviceData.data) {
        if (!Array.isArray(dataPoint) || dataPoint.length !== 2) {
          continue;
        }

        const [, coordinates] = dataPoint;
        if (!Array.isArray(coordinates) || coordinates.length !== 3) {
          continue;
        }

        const [x, y, speed] = coordinates;
        totalSpeed += speed;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      const avgSpeed = dataLength > 0 ? totalSpeed / dataLength : 0;

      const processedSignal: ProcessedSignal = {
        deviceId,
        time: new Date(deviceData.time),
        dataLength,
        dataVolume,
        avgSpeed,
        minCoordinates: { x: minX, y: minY },
        maxCoordinates: { x: maxX, y: maxY },
      };

      processedSignals.push(processedSignal);
    }

    return processedSignals;
  }

  async saveProcessedSignals(
    processedSignals: ProcessedSignal[],
  ): Promise<Signal[]> {
    const savedSignals: Signal[] = [];

    for (const signal of processedSignals) {
      try {
        const createdSignal = new this.signalModel(signal);
        const saved = await createdSignal.save();
        savedSignals.push(saved);
      } catch (error) {
        console.error(
          `Failed to save signal for device ${signal.deviceId}:`,
          error,
        );
      }
    }

    return savedSignals;
  }

  async findAll(
    filterDto: FilterSignalDto,
  ): Promise<PaginatedSignalDto> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = filterDto;
    const query: FilterQuery<SignalDocument> = {};

    if (filters.deviceId) {
      query.deviceId = filters.deviceId;
    }

    if (filters.startDate || filters.endDate) {
      const timeQuery: { $gte?: Date; $lte?: Date } = {};
      if (filters.startDate) {
        timeQuery.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        timeQuery.$lte = new Date(filters.endDate);
      }
      query.time = timeQuery;
    }

    if (
      filters.minDataLength !== undefined ||
      filters.maxDataLength !== undefined
    ) {
      const dataLengthQuery: { $gte?: number; $lte?: number } = {};
      if (filters.minDataLength !== undefined) {
        dataLengthQuery.$gte = filters.minDataLength;
      }
      if (filters.maxDataLength !== undefined) {
        dataLengthQuery.$lte = filters.maxDataLength;
      }
      query.dataLength = dataLengthQuery;
    }

    if (
      filters.minDataVolume !== undefined ||
      filters.maxDataVolume !== undefined
    ) {
      const dataVolumeQuery: { $gte?: number; $lte?: number } = {};
      if (filters.minDataVolume !== undefined) {
        dataVolumeQuery.$gte = filters.minDataVolume;
      }
      if (filters.maxDataVolume !== undefined) {
        dataVolumeQuery.$lte = filters.maxDataVolume;
      }
      query.dataVolume = dataVolumeQuery;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [data, total] = await Promise.all([
      this.signalModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-rawData')
        .exec(),
      this.signalModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    
    return {
      data: data as SignalResponseDto[],
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async findOne(id: string): Promise<SignalResponseDto> {
    try {
      const signal = await this.signalModel.findById(id).exec();
      if (!signal) {
        throw new NotFoundException(`Signal with ID ${id} not found`);
      }
      return signal.toObject() as SignalResponseDto;
    } catch (error) {
      if (isError(error) && error.name === 'CastError') {
        throw new BadRequestException(`Invalid signal ID: ${id}`);
      }
      throw error;
    }
  }

  async update(id: string, updateSignalDto: UpdateSignalDto): Promise<SignalResponseDto> {
    try {
      const updatedSignal = await this.signalModel
        .findByIdAndUpdate(id, updateSignalDto, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedSignal) {
        throw new NotFoundException(`Signal with ID ${id} not found`);
      }

      return updatedSignal.toObject() as SignalResponseDto;
    } catch (error) {
      if (isError(error) && error.name === 'CastError') {
        throw new BadRequestException(`Invalid signal ID: ${id}`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.signalModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`Signal with ID ${id} not found`);
      }
    } catch (error) {
      if (isError(error) && error.name === 'CastError') {
        throw new BadRequestException(`Invalid signal ID: ${id}`);
      }
      throw error;
    }
  }

  async getDeviceStatistics(deviceId: string): Promise<DeviceStatsDto> {
    const stats = await this.signalModel.aggregate([
      { $match: { deviceId } },
      {
        $group: {
          _id: '$deviceId',
          totalSignals: { $sum: 1 },
          avgDataLength: { $avg: '$dataLength' },
          avgDataVolume: { $avg: '$dataVolume' },
          avgSpeed: { $avg: '$avgSpeed' },
          minDataLength: { $min: '$dataLength' },
          maxDataLength: { $max: '$dataLength' },
          minDataVolume: { $min: '$dataVolume' },
          maxDataVolume: { $max: '$dataVolume' },
          firstSignal: { $min: '$time' },
          lastSignal: { $max: '$time' },
        },
      },
    ]);

    if (stats.length === 0) {
      throw new NotFoundException(`No statistics found for device ${deviceId}`);
    }

    return stats[0] as DeviceStatsDto;
  }
}
