import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SignalsModule } from '../src/signals/signals.module';
import { Signal, SignalSchema } from '../src/signals/schemas/signal.schema';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/* eslint-disable @typescript-eslint/no-unsafe-argument */
describe('Signals API (e2e)', () => {
  let app: INestApplication;
  let dbConnection: Connection;
  let mongod: MongoMemoryServer;

  const testSignal = {
    deviceId: 'test-device-001',
    time: new Date('2024-01-01T10:00:00Z'),
    dataLength: 100,
    dataVolume: 2048,
    avgSpeed: 1.5,
    minCoordinates: { x: 51.33, y: 12.33 },
    maxCoordinates: { x: 51.34, y: 12.34 },
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              database: {
                uri: uri,
              },
            }),
          ],
        }),
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: Signal.name, schema: SignalSchema },
        ]),
        SignalsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dbConnection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await dbConnection.collection('signals').deleteMany({});
    await dbConnection.close();
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await dbConnection.collection('signals').deleteMany({});
  });

  describe('POST /signals', () => {
    it('should create a new signal', () => {
      return request(app.getHttpServer())
        .post('/signals')
        .send(testSignal)
        .expect(201)
        .expect((res) => {
          const body = res.body as Record<string, unknown>;
          expect(body).toHaveProperty('_id');
          expect(body.deviceId).toBe(testSignal.deviceId);
          expect(body.dataLength).toBe(testSignal.dataLength);
          expect(body.dataVolume).toBe(testSignal.dataVolume);
        });
    });

    it('should reject invalid signal data', () => {
      return request(app.getHttpServer())
        .post('/signals')
        .send({
          deviceId: 'test-device',
        })
        .expect(400);
    });

    it('should reject signal with invalid coordinates', () => {
      return request(app.getHttpServer())
        .post('/signals')
        .send({
          ...testSignal,
          minCoordinates: 'invalid',
        })
        .expect(400);
    });
  });

  describe('GET /signals', () => {
    beforeEach(async () => {
      await dbConnection.collection('signals').insertMany([
        { ...testSignal, deviceId: 'device-1' },
        { ...testSignal, deviceId: 'device-2' },
        { ...testSignal, deviceId: 'device-3' },
      ]);
    });

    it('should return paginated signals', () => {
      return request(app.getHttpServer())
        .get('/signals')
        .query({ page: 1, limit: 2 })
        .expect(200)
        .expect((res) => {
          const body = res.body as Record<string, unknown>;
          expect(body.data).toHaveLength(2);
          expect(body.total).toBe(3);
          expect(body.page).toBe(1);
          expect(body.limit).toBe(2);
        });
    });

    it('should filter signals by deviceId', () => {
      return request(app.getHttpServer())
        .get('/signals')
        .query({ deviceId: 'device-1' })
        .expect(200)
        .expect((res) => {
          const body = res.body as { data: Array<{ deviceId: string }> };
          expect(body.data).toHaveLength(1);
          expect(body.data[0].deviceId).toBe('device-1');
        });
    });

    it('should sort signals', () => {
      return request(app.getHttpServer())
        .get('/signals')
        .query({ sortBy: 'deviceId', sortOrder: 'asc' })
        .expect(200)
        .expect((res) => {
          const body = res.body as { data: Array<{ deviceId: string }> };
          expect(body.data[0].deviceId).toBe('device-1');
          expect(body.data[1].deviceId).toBe('device-2');
        });
    });
  });

  describe('GET /signals/filter', () => {
    beforeEach(async () => {
      await dbConnection.collection('signals').insertMany([
        { ...testSignal, deviceId: 'device-1', dataLength: 50 },
        { ...testSignal, deviceId: 'device-2', dataLength: 150 },
        { ...testSignal, deviceId: 'device-3', dataLength: 200 },
      ]);
    });

    it('should filter by data length range', () => {
      return request(app.getHttpServer())
        .get('/signals/filter')
        .query({ minDataLength: 100, maxDataLength: 200 })
        .expect(200)
        .expect((res) => {
          const body = res.body as { data: Array<{ dataLength: number }> };
          expect(body.data).toHaveLength(2);
          expect(
            body.data.every((s) => s.dataLength >= 100 && s.dataLength <= 200),
          ).toBe(true);
        });
    });

    it('should filter by date range', () => {
      return request(app.getHttpServer())
        .get('/signals/filter')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z',
        })
        .expect(200)
        .expect((res) => {
          const body = res.body as { data: unknown };
          expect(body.data).toBeDefined();
        });
    });
  });

  describe('GET /signals/:id', () => {
    let signalId: string;

    beforeEach(async () => {
      const result = await dbConnection
        .collection('signals')
        .insertOne(testSignal);
      signalId = result.insertedId.toString();
    });

    it('should return a signal by id', () => {
      return request(app.getHttpServer())
        .get(`/signals/${signalId}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as { _id: string; deviceId: string };
          expect(body._id).toBe(signalId);
          expect(body.deviceId).toBe(testSignal.deviceId);
        });
    });

    it('should return 404 for non-existent signal', () => {
      return request(app.getHttpServer())
        .get('/signals/507f1f77bcf86cd799439999')
        .expect(404);
    });

    it('should return 400 for invalid id format', () => {
      return request(app.getHttpServer())
        .get('/signals/invalid-id')
        .expect(400);
    });
  });

  describe('PUT /signals/:id', () => {
    let signalId: string;

    beforeEach(async () => {
      const result = await dbConnection
        .collection('signals')
        .insertOne(testSignal);
      signalId = result.insertedId.toString();
    });

    it('should update a signal', () => {
      return request(app.getHttpServer())
        .put(`/signals/${signalId}`)
        .send({ dataLength: 200 })
        .expect(200)
        .expect((res) => {
          const body = res.body as { dataLength: number };
          expect(body.dataLength).toBe(200);
        });
    });

    it('should return 404 for non-existent signal', () => {
      return request(app.getHttpServer())
        .put('/signals/507f1f77bcf86cd799439999')
        .send({ dataLength: 200 })
        .expect(404);
    });
  });

  describe('DELETE /signals/:id', () => {
    let signalId: string;

    beforeEach(async () => {
      const result = await dbConnection
        .collection('signals')
        .insertOne(testSignal);
      signalId = result.insertedId.toString();
    });

    it('should delete a signal', () => {
      return request(app.getHttpServer())
        .delete(`/signals/${signalId}`)
        .expect(204);
    });

    it('should return 404 for non-existent signal', () => {
      return request(app.getHttpServer())
        .delete('/signals/507f1f77bcf86cd799439999')
        .expect(404);
    });
  });

  describe('GET /signals/stats/:deviceId', () => {
    beforeEach(async () => {
      await dbConnection.collection('signals').deleteMany({});
      const signals = [
        { ...testSignal, deviceId: 'device-1', dataLength: 50 },
        { ...testSignal, deviceId: 'device-1', dataLength: 150 },
        { ...testSignal, deviceId: 'device-1', dataLength: 100 },
      ];

      for (const signal of signals) {
        delete signal._id;
        await dbConnection.collection('signals').insertOne(signal);
      }
    });

    it('should return device statistics', () => {
      return request(app.getHttpServer())
        .get('/signals/stats/device-1')
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            _id: string;
            totalSignals: number;
            avgDataLength: number;
          };
          expect(body._id).toBe('device-1');
          expect(body.totalSignals).toBe(3);
          expect(body.avgDataLength).toBe(100);
        });
    });

    it('should return 404 for non-existent device', () => {
      return request(app.getHttpServer())
        .get('/signals/stats/non-existent-device')
        .expect(404);
    });
  });
});
