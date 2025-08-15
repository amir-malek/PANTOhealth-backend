import { Injectable } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import {
  XRayMessage,
  DataPoint,
  isXRayMessage,
  isError,
} from '../common/types';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProducerService {
  private sampleData: XRayMessage;

  constructor(private rabbitMQService: RabbitMQService) {
    this.loadSampleData();
  }

  private loadSampleData() {
    try {
      const dataPath = path.join(process.cwd(), 'sample-xray-data.json');
      if (fs.existsSync(dataPath)) {
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const parsedData: unknown = JSON.parse(rawData);
        if (isXRayMessage(parsedData)) {
          this.sampleData = parsedData;
        } else {
          throw new Error('Invalid sample data format');
        }
        if (process.env.NODE_ENV !== 'test') {
          console.log('Sample x-ray data loaded successfully');
        }
      } else {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Sample data file not found, using default data');
        }
        this.sampleData = this.getDefaultSampleData();
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        if (process.env.NODE_ENV !== 'test') {
          console.error('Error loading sample data:', error);
        }
      }
      this.sampleData = this.getDefaultSampleData();
    }
  }

  private getDefaultSampleData(): XRayMessage {
    const data: DataPoint[] = [
      [762, [51.339764, 12.339223833333334, 1.2038000000000002]],
      [1766, [51.33977733333333, 12.339211833333334, 1.531604]],
      [2763, [51.339782, 12.339196166666667, 2.13906]],
    ];

    return {
      '66bb584d4ae73e488c30a072': {
        data,
        time: Date.now(),
      },
    };
  }

  async sendSampleData(): Promise<{
    success: boolean;
    message: string;
    dataSize: number;
  }> {
    try {
      const success = await this.rabbitMQService.publishMessage(
        this.sampleData,
      );

      if (success) {
        const dataSize = Buffer.byteLength(JSON.stringify(this.sampleData));
        return {
          success: true,
          message: 'Sample x-ray data sent successfully',
          dataSize,
        };
      } else {
        return {
          success: false,
          message: 'Failed to send sample data',
          dataSize: 0,
        };
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error sending sample data:', error);
      }
      return {
        success: false,
        message: `Error: ${isError(error) ? error.message : String(error)}`,
        dataSize: 0,
      };
    }
  }

  async sendCustomData(
    data: unknown,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!isXRayMessage(data)) {
        return {
          success: false,
          message: 'Invalid data format: expected XRayMessage structure',
        };
      }

      const success = await this.rabbitMQService.publishMessage(data);

      return {
        success,
        message: success
          ? 'Custom data sent successfully'
          : 'Failed to send custom data',
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error sending custom data:', error);
      }
      return {
        success: false,
        message: `Error: ${isError(error) ? error.message : String(error)}`,
      };
    }
  }

  async sendBatchData(
    count: number = 10,
    delayMs: number = 1000,
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
      const modifiedData = this.generateModifiedSampleData(i);

      try {
        const success = await this.rabbitMQService.publishMessage(modifiedData);
        if (success) {
          sent++;
        } else {
          failed++;
        }

        if (i < count - 1 && delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
          console.error(`Error sending batch item ${i + 1}:`, error);
        }
        failed++;
      }
    }

    return {
      success: failed === 0,
      sent,
      failed,
    };
  }

  private generateModifiedSampleData(index: number) {
    const deviceIds = [
      '66bb584d4ae73e488c30a072',
      '66bb584d4ae73e488c30a073',
      '66bb584d4ae73e488c30a074',
      '66bb584d4ae73e488c30a075',
    ];

    const deviceId = deviceIds[index % deviceIds.length];
    const timestamp = Date.now() - index * 60000;

    const dataPoints: Array<[number, [number, number, number]]> = [];
    const numPoints = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < numPoints; i++) {
      const time = i * 1000;
      const x = 51.339764 + (Math.random() - 0.5) * 0.001;
      const y = 12.339223833333334 + (Math.random() - 0.5) * 0.001;
      const speed = 1 + Math.random() * 2;
      dataPoints.push([time, [x, y, speed]]);
    }

    return {
      [deviceId]: {
        data: dataPoints,
        time: timestamp,
      },
    };
  }
}
