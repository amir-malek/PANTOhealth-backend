export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/xray-iot-system',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    queue: process.env.RABBITMQ_QUEUE || 'xray-queue',
    exchange: process.env.RABBITMQ_EXCHANGE || 'xray-exchange',
    routingKey: process.env.RABBITMQ_ROUTING_KEY || 'xray.data',
  },
  environment: process.env.NODE_ENV || 'development',
});
