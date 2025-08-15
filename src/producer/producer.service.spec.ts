import { Test, TestingModule } from '@nestjs/testing';
import { ProducerService } from './producer.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import * as fs from 'fs';

jest.mock('fs');

describe('ProducerService', () => {
  let service: ProducerService;

  const mockRabbitMQService = {
    publishMessage: jest.fn(),
  };

  beforeEach(async () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProducerService,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    service = module.get<ProducerService>(ProducerService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendSampleData', () => {
    it('should send sample data successfully', async () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      const result = await service.sendSampleData();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Sample x-ray data sent successfully');
      expect(result.dataSize).toBeGreaterThan(0);
      expect(mockRabbitMQService.publishMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle failure to send sample data', async () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(false);

      const result = await service.sendSampleData();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send sample data');
      expect(result.dataSize).toBe(0);
    });

    it('should handle errors when sending sample data', async () => {
      mockRabbitMQService.publishMessage.mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await service.sendSampleData();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error: Connection failed');
      expect(result.dataSize).toBe(0);
    });
  });

  describe('sendCustomData', () => {
    it('should send custom data successfully', async () => {
      const customData = {
        'device-001': {
          data: [[100, [51.5, 12.5, 2.0]]],
          time: Date.now(),
        },
      };
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      const result = await service.sendCustomData(customData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Custom data sent successfully');
      expect(mockRabbitMQService.publishMessage).toHaveBeenCalledWith(
        customData,
      );
    });

    it('should handle invalid data format', async () => {
      const invalidData = { test: 'data' };

      const result = await service.sendCustomData(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Invalid data format: expected XRayMessage structure',
      );
      expect(mockRabbitMQService.publishMessage).not.toHaveBeenCalled();
    });

    it('should handle failure to send valid custom data', async () => {
      const customData = {
        'device-001': {
          data: [[100, [51.5, 12.5, 2.0]]],
          time: Date.now(),
        },
      };
      mockRabbitMQService.publishMessage.mockResolvedValue(false);

      const result = await service.sendCustomData(customData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send custom data');
    });
  });

  describe('sendBatchData', () => {
    it('should send batch data successfully', async () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      const result = await service.sendBatchData(3, 0);

      expect(result.success).toBe(true);
      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockRabbitMQService.publishMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle partial batch failures', async () => {
      mockRabbitMQService.publishMessage
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.sendBatchData(3, 0);

      expect(result.success).toBe(false);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should handle batch with delay', async () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(true);
      const startTime = Date.now();

      const result = await service.sendBatchData(2, 100);

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      expect(result.sent).toBe(2);
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });
});
