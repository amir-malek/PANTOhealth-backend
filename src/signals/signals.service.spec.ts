import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SignalsService } from './signals.service';
import { Signal } from './schemas/signal.schema';
import { CreateSignalDto } from './dto/create-signal.dto';
import { FilterSignalDto } from './dto/filter-signal.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { XRayMessage } from '../common/interfaces/xray-data.interface';

describe('SignalsService', () => {
  let service: SignalsService;

  const mockSignal = {
    _id: '507f1f77bcf86cd799439011',
    deviceId: '66bb584d4ae73e488c30a072',
    time: new Date('2024-01-01'),
    dataLength: 10,
    dataVolume: 1024,
    avgSpeed: 1.5,
    minCoordinates: { x: 51.33, y: 12.33 },
    maxCoordinates: { x: 51.34, y: 12.34 },
    save: jest.fn(),
  };

  const findMock = jest.fn();
  const findByIdMock = jest.fn();
  const findByIdAndUpdateMock = jest.fn();
  const findByIdAndDeleteMock = jest.fn();
  const countDocumentsMock = jest.fn();
  const aggregateMock = jest.fn();
  const createMock = jest.fn();
  const execMock = jest.fn();

  const mockSignalModel = jest.fn().mockImplementation(() => ({
    ...mockSignal,
    save: jest.fn().mockResolvedValue(mockSignal),
  }));

  mockSignalModel.find = findMock;
  mockSignalModel.findById = findByIdMock;
  mockSignalModel.findByIdAndUpdate = findByIdAndUpdateMock;
  mockSignalModel.findByIdAndDelete = findByIdAndDeleteMock;
  mockSignalModel.countDocuments = countDocumentsMock;
  mockSignalModel.aggregate = aggregateMock;
  mockSignalModel.create = createMock;
  mockSignalModel.exec = execMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalsService,
        {
          provide: getModelToken(Signal.name),
          useValue: mockSignalModel,
        },
      ],
    }).compile();

    service = module.get<SignalsService>(SignalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new signal', async () => {
      const createSignalDto: CreateSignalDto = {
        deviceId: '66bb584d4ae73e488c30a072',
        time: new Date('2024-01-01'),
        dataLength: 10,
        dataVolume: 1024,
        avgSpeed: 1.5,
        minCoordinates: { x: 51.33, y: 12.33 },
        maxCoordinates: { x: 51.34, y: 12.34 },
      };

      const result = await service.create(createSignalDto);
      expect(result).toBeDefined();
      expect(result).toEqual(mockSignal);
    });
  });

  describe('processXRayData', () => {
    it('should process x-ray data correctly', () => {
      const xrayMessage: XRayMessage = {
        '66bb584d4ae73e488c30a072': {
          data: [
            [762, [51.339764, 12.339223833333334, 1.2038]],
            [1766, [51.33977733333333, 12.339211833333334, 1.531604]],
          ],
          time: 1735683480000,
        },
      };

      const result = service.processXRayData(xrayMessage);

      expect(result).toHaveLength(1);
      expect(result[0].deviceId).toBe('66bb584d4ae73e488c30a072');
      expect(result[0].dataLength).toBe(2);
      expect(result[0].avgSpeed).toBeCloseTo(1.367702, 5);
    });

    it('should throw BadRequestException for invalid data format', () => {
      const invalidMessage = {
        device123: {
          data: null,
          time: 1735683480000,
        },
      };

      expect(() => service.processXRayData(invalidMessage)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated signals', async () => {
      const filterDto: FilterSignalDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const mockData = [mockSignal];

      findMock.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockData),
      });
      countDocumentsMock.mockResolvedValue(1);

      const result = await service.findAll(filterDto);

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return a signal by id', async () => {
      findByIdMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSignal),
      });

      const result = await service.findOne('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockSignal);
    });

    it('should throw NotFoundException when signal not found', async () => {
      findByIdMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDeviceStatistics', () => {
    it('should return device statistics', async () => {
      const mockStats = {
        _id: '66bb584d4ae73e488c30a072',
        totalSignals: 100,
        avgDataLength: 15.5,
        avgDataVolume: 2048,
        avgSpeed: 1.8,
      };

      aggregateMock.mockResolvedValue([mockStats]);

      const result = await service.getDeviceStatistics(
        '66bb584d4ae73e488c30a072',
      );
      expect(result).toEqual(mockStats);
    });

    it('should throw NotFoundException when no statistics found', async () => {
      aggregateMock.mockResolvedValue([]);

      await expect(
        service.getDeviceStatistics('unknown-device'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
