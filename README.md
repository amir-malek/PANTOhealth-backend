# IoT Data Management System

## Description

A comprehensive NestJS application for processing x-ray data from IoT devices using RabbitMQ message queuing, MongoDB for data persistence, and RESTful APIs for data retrieval and analysis.

## Features

- ✅ RabbitMQ integration for message processing
- ✅ MongoDB with Mongoose ODM for data persistence
- ✅ RESTful API with CRUD operations
- ✅ Advanced filtering and pagination
- ✅ Real-time x-ray data processing
- ✅ Comprehensive error handling
- ✅ Swagger API documentation
- ✅ Docker support
- ✅ Unit tests for core components

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- RabbitMQ (v3.12 or higher)
- Docker & Docker Compose (optional)

## Quick Start with Docker

### Development Mode

```bash
# Clone the repository
git clone <repository-url>
cd nest-test

# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production Mode

```bash
# Start with production configuration
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Service URLs

**Development:**
- API: http://localhost:3001
- Swagger: http://localhost:3001/api
- RabbitMQ Management: http://localhost:15672 (admin/admin123)
- MongoDB: mongodb://localhost:27017/xray-iot-system

**Production:**
- API: http://localhost:3001
- Swagger: http://localhost:3001/api
- RabbitMQ Management: http://localhost:15672 (admin/rabbitmq_admin_pass_2024)
- MongoDB: mongodb://admin:mongo_admin_pass_2024@localhost:27017/xray-iot-system?authSource=admin

## Docker Networking

The application uses a custom bridge network (`xray-network`) for reliable inter-service communication:

- **MongoDB**: Internal hostname `mongodb` (port 27017)
- **RabbitMQ**: Internal hostname `rabbitmq` (port 5672)
- **App**: Connects using container hostnames

### Service Dependencies

The Docker setup includes:
- Health checks for all services
- Proper startup order (MongoDB → RabbitMQ → App)
- Automatic restart on failure
- Connection retry logic
- Wait script for service readiness

## Manual Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/xray-iot-system
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_QUEUE=xray-queue
RABBITMQ_EXCHANGE=xray-exchange
RABBITMQ_ROUTING_KEY=xray.data
NODE_ENV=development
```

### 3. Start Required Services

```bash
# Start MongoDB
mongod

# Start RabbitMQ
rabbitmq-server
```

### 4. Run the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, visit `http://localhost:3001/api` for interactive Swagger documentation.

### Main Endpoints

#### Signals API
- `GET /signals` - List all signals with pagination
- `GET /signals/:id` - Get signal by ID
- `GET /signals/filter` - Advanced filtering
- `GET /signals/stats/:deviceId` - Device statistics
- `POST /signals` - Create new signal
- `PUT /signals/:id` - Update signal
- `DELETE /signals/:id` - Delete signal

#### Producer API
- `POST /producer/send` - Send sample x-ray data
- `POST /producer/send-custom` - Send custom data
- `POST /producer/send-batch` - Send multiple messages

## Testing

```bash
# Unit tests
npm run test

# Test with watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Project Structure

```
src/
├── config/           # Configuration module
├── database/         # Database connection module
├── rabbitmq/         # RabbitMQ service and consumer
├── signals/          # Signal entity and business logic
│   ├── dto/         # Data transfer objects
│   └── schemas/     # Mongoose schemas
├── producer/         # Producer module for sending data
└── common/          # Shared interfaces and filters

```

## Data Processing Flow

1. IoT devices send x-ray data to RabbitMQ
2. Consumer processes and validates the data
3. Processed signals are stored in MongoDB
4. REST API provides access to stored data

## Sample X-Ray Data Format

```json
{
  "66bb584d4ae73e488c30a072": {
    "data": [
      [762, [51.339764, 12.339223833333334, 1.2038]],
      [1766, [51.33977733333333, 12.339211833333334, 1.531604]]
    ],
    "time": 1735683480000
  }
}
```

## Processed Signal Schema

- `deviceId` - IoT device identifier
- `time` - Timestamp of the data
- `dataLength` - Number of data points
- `dataVolume` - Size of data in bytes
- `avgSpeed` - Average speed from data points
- `minCoordinates` - Minimum x,y coordinates
- `maxCoordinates` - Maximum x,y coordinates

## Production Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Scale the application
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

### Using Docker Standalone

```bash
# Build the image
docker build -t xray-iot-system .

# Create network
docker network create xray-network

# Start MongoDB
docker run -d --name mongodb \
  --network xray-network \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=mongo_admin_pass_2024 \
  -p 27017:27017 \
  mongo:7

# Start RabbitMQ
docker run -d --name rabbitmq \
  --network xray-network \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=rabbitmq_admin_pass_2024 \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management-alpine

# Start Application
docker run -d --name xray-app \
  --network xray-network \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://admin:mongo_admin_pass_2024@mongodb:27017/xray-iot-system?authSource=admin \
  -e RABBITMQ_URL=amqp://admin:rabbitmq_admin_pass_2024@rabbitmq:5672 \
  xray-iot-system
```

### Environment Configuration

For production, ensure these environment variables are properly configured:
- Use connection strings with authentication
- Enable SSL/TLS for MongoDB and RabbitMQ
- Set `NODE_ENV=production`
- Configure appropriate resource limits

## Monitoring

The application includes health checks for:
- MongoDB connection status
- RabbitMQ connection status
- API endpoint availability

## License

MIT
