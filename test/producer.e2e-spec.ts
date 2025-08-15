import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProducerController } from '../src/producer/producer.controller';
import { ProducerService } from '../src/producer/producer.service';
import { RabbitMQService } from '../src/rabbitmq/rabbitmq.service';

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
describe('Producer API (e2e)', () => {
  let app: INestApplication;

  const mockRabbitMQService = {
    publishMessage: jest.fn(),
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProducerController],
      providers: [
        ProducerService,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /producer/send', () => {
    it('should send sample data successfully', () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      return request(app.getHttpServer())
        .post('/producer/send')
        .expect(200)
        .expect((res) => {
          const responseBody = res.body as unknown;
          if (responseBody && typeof responseBody === 'object') {
            if (
              'success' in responseBody &&
              'message' in responseBody &&
              'dataSize' in responseBody
            ) {
              expect(responseBody.success).toBe(true);
              expect(responseBody.message).toBe(
                'Sample x-ray data sent successfully',
              );
              expect(responseBody.dataSize).toBeGreaterThan(0);
            }
          }
          expect(mockRabbitMQService.publishMessage).toHaveBeenCalledTimes(1);
        });
    });

    it('should handle failed message publishing', () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(false);

      return request(app.getHttpServer())
        .post('/producer/send')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('Failed to send sample data');
          expect(res.body.dataSize).toBe(0);
        });
    });

    it('should handle exceptions during publishing', () => {
      mockRabbitMQService.publishMessage.mockRejectedValue(
        new Error('Connection error'),
      );

      return request(app.getHttpServer())
        .post('/producer/send')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Error: Connection error');
          expect(res.body.dataSize).toBe(0);
        });
    });
  });

  describe('POST /producer/send-custom', () => {
    const customData = {
      '66bb584d4ae73e488c30a999': {
        data: [
          [100, [51.5, 12.5, 2.0]],
          [200, [51.6, 12.6, 2.5]],
        ],
        time: 1735683480000,
      },
    };

    it('should send custom data successfully', () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      return request(app.getHttpServer())
        .post('/producer/send-custom')
        .send(customData)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Custom data sent successfully');
          expect(mockRabbitMQService.publishMessage).toHaveBeenCalledWith(
            customData,
          );
        });
    });

    it('should handle failed custom data publishing', () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(false);

      return request(app.getHttpServer())
        .post('/producer/send-custom')
        .send(customData)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('Failed to send custom data');
        });
    });

    it('should reject invalid JSON structure', () => {
      const invalidData = { test: 'data', nested: { value: 123 } };

      return request(app.getHttpServer())
        .post('/producer/send-custom')
        .send(invalidData)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe(
            'Invalid data format: expected XRayMessage structure',
          );
          expect(mockRabbitMQService.publishMessage).not.toHaveBeenCalled();
        });
    });
  });

  describe('POST /producer/send-batch', () => {
    it('should send batch data successfully', () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      return request(app.getHttpServer())
        .post('/producer/send-batch')
        .query({ count: 3, delayMs: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.sent).toBe(3);
          expect(res.body.failed).toBe(0);
          expect(mockRabbitMQService.publishMessage).toHaveBeenCalledTimes(3);
        });
    });

    it('should handle partial batch failures', () => {
      mockRabbitMQService.publishMessage
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      return request(app.getHttpServer())
        .post('/producer/send-batch')
        .query({ count: 3, delayMs: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.sent).toBe(2);
          expect(res.body.failed).toBe(1);
        });
    });

    it('should use default values when no query params provided', () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      return request(app.getHttpServer())
        .post('/producer/send-batch')
        .query({ delayMs: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.sent).toBe(10);
          expect(mockRabbitMQService.publishMessage).toHaveBeenCalledTimes(10);
        });
    }, 10000);

    it('should handle invalid count parameter', () => {
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      return request(app.getHttpServer())
        .post('/producer/send-batch')
        .query({ count: 'invalid', delayMs: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.sent).toBe(10);
          expect(mockRabbitMQService.publishMessage).toHaveBeenCalledTimes(10);
        });
    }, 10000);

    it('should handle exceptions during batch sending', () => {
      mockRabbitMQService.publishMessage
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce(true);

      return request(app.getHttpServer())
        .post('/producer/send-batch')
        .query({ count: 3, delayMs: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.sent).toBe(2);
          expect(res.body.failed).toBe(1);
        });
    });
  });
});
