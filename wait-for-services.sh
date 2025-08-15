#!/bin/sh

set -e

echo "Waiting for MongoDB..."
until nc -z mongodb 27017; do
  echo "MongoDB is unavailable - sleeping"
  sleep 2
done
echo "MongoDB is up"

echo "Waiting for RabbitMQ..."
until nc -z rabbitmq 5672; do
  echo "RabbitMQ is unavailable - sleeping"
  sleep 2
done
echo "RabbitMQ is up"

echo "Waiting additional 5 seconds for services to be fully ready..."
sleep 5

echo "Starting application..."
exec "$@"