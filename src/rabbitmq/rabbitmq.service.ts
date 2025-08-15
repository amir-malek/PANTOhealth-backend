import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  ChannelWrapper,
  AmqpConnectionManager,
  connect,
} from 'amqp-connection-manager';
import { XRayMessage, DisconnectError, isXRayMessage } from '../common/types';

function isAmqpChannel(value: unknown): value is amqp.Channel {
  return (
    value !== null &&
    typeof value === 'object' &&
    'assertExchange' in value &&
    'assertQueue' in value &&
    'bindQueue' in value &&
    'prefetch' in value &&
    'consume' in value &&
    'ack' in value &&
    'nack' in value
  );
}

function isConsumeMessage(value: unknown): value is amqp.ConsumeMessage {
  return (
    value !== null &&
    typeof value === 'object' &&
    'content' in value &&
    'fields' in value &&
    'properties' in value
  );
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private readonly queue: string;
  private readonly exchange: string;
  private readonly routingKey: string;

  constructor(private configService: ConfigService) {
    this.queue =
      this.configService.get<string>('rabbitmq.queue') || 'xray-queue';
    this.exchange =
      this.configService.get<string>('rabbitmq.exchange') || 'xray-exchange';
    this.routingKey =
      this.configService.get<string>('rabbitmq.routingKey') || 'xray.data';
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const url = this.configService.get<string>('rabbitmq.url');

      this.connection = connect([url], {
        reconnectTimeInSeconds: 5,
        heartbeatIntervalInSeconds: 60,
      });

      this.connection.on('connect', () => {
        console.log('Connected to RabbitMQ');
      });

      this.connection.on('disconnect', (err: DisconnectError) => {
        console.error(
          'Disconnected from RabbitMQ:',
          err?.message || 'Unknown error',
        );
      });

      const setupFunc = async (channel: unknown): Promise<void> => {
        if (isAmqpChannel(channel)) {
          /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
          await channel.assertExchange(this.exchange, 'topic', {
            durable: true,
          });
          await channel.assertQueue(this.queue, { durable: true });
          await channel.bindQueue(this.queue, this.exchange, this.routingKey);
          await channel.prefetch(10);
          /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
          console.log(
            `Queue ${this.queue} bound to exchange ${this.exchange} with routing key ${this.routingKey}`,
          );
        }
      };

      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: setupFunc,
      });

      await this.channelWrapper.waitForConnect();
      console.log('RabbitMQ channel wrapper initialized');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      setTimeout(() => {
        void this.connect();
      }, 5000);
    }
  }

  private async disconnect() {
    try {
      await this.channelWrapper?.close();
      await this.connection?.close();
      console.log('Disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  async publishMessage(
    message: unknown,
    routingKey?: string,
  ): Promise<boolean> {
    try {
      if (!isXRayMessage(message)) {
        console.error('Invalid message format: not an XRayMessage');
        return false;
      }

      await this.channelWrapper.publish(
        this.exchange,
        routingKey || this.routingKey,
        message,
      );
      return true;
    } catch (error) {
      console.error('Failed to publish message:', error);
      return false;
    }
  }

  async consumeMessages(
    handler: (msg: XRayMessage) => Promise<void>,
  ): Promise<void> {
    try {
      const consumerSetup = (channel: unknown) => {
        if (isAmqpChannel(channel)) {
          /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
          return channel.consume(this.queue, async (message) => {
            if (isConsumeMessage(message)) {
              try {
                const messageContent = message.content;
                const rawContent = messageContent.toString();
                const parsedContent: unknown = JSON.parse(rawContent);

                if (!isXRayMessage(parsedContent)) {
                  console.error('Received invalid message format');
                  channel.nack(message, false, false);
                  return;
                }

                await handler(parsedContent);
                channel.ack(message);
              } catch (error) {
                console.error('Error processing message:', error);
                channel.nack(message, false, false);
              }
            }
          });
          /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
        }
        return Promise.resolve();
      };

      await this.channelWrapper.addSetup(consumerSetup);
    } catch (error) {
      console.error('Failed to set up consumer:', error);
    }
  }

  getChannelWrapper(): ChannelWrapper {
    return this.channelWrapper;
  }
}
