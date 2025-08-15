import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { SignalsService } from '../signals/signals.service';
import { XRayMessage } from '../common/interfaces/xray-data.interface';

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
  constructor(
    private rabbitMQService: RabbitMQService,
    private signalsService: SignalsService,
  ) {}

  onModuleInit() {
    setTimeout(() => {
      void this.startConsuming();
    }, 5000);
  }

  private async startConsuming() {
    try {
      console.log('Starting RabbitMQ consumer...');
      await this.rabbitMQService.consumeMessages(
        async (message: XRayMessage) => {
          try {
            console.log('Received x-ray message for processing');

            const processedSignals =
              this.signalsService.processXRayData(message);

            if (processedSignals.length > 0) {
              const savedSignals =
                await this.signalsService.saveProcessedSignals(
                  processedSignals,
                );
              console.log(
                `Successfully processed and saved ${savedSignals.length} signals`,
              );
            } else {
              console.warn('No signals were processed from the message');
            }
          } catch (error) {
            console.error('Error processing x-ray data:', error);
            throw error;
          }
        },
      );
      console.log('RabbitMQ consumer started successfully');
    } catch (error) {
      console.error('Failed to start consumer, retrying in 10 seconds:', error);
      setTimeout(() => {
        void this.startConsuming();
      }, 10000);
    }
  }
}
