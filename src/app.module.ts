import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { SignalsModule } from './signals/signals.module';
import { ProducerModule } from './producer/producer.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SignalsModule,
    RabbitMQModule,
    ProducerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
