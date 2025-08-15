import { HttpException } from '@nestjs/common';
import { Connection } from 'mongoose';
export type Coordinate3D = [x: number, y: number, speed: number];

export type DataPoint = [timestamp: number, coordinates: Coordinate3D];

export interface DeviceData {
  data: DataPoint[];
  time: number;
}

export interface XRayMessage {
  [deviceId: string]: DeviceData;
}

export interface ProcessedSignal {
  deviceId: string;
  time: Date;
  dataLength: number;
  dataVolume: number;
  avgSpeed: number;
  minCoordinates: {
    x: number;
    y: number;
  };
  maxCoordinates: {
    x: number;
    y: number;
  };
}

export interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export interface MongoServerError extends Error {
  code?: number;
}

export interface DisconnectError {
  message?: string;
  code?: string;
}

export function isHttpException(error: unknown): error is HttpException {
  return error instanceof HttpException;
}

export function isMongoServerError(error: unknown): error is MongoServerError {
  return (
    error instanceof Error &&
    error.name === 'MongoServerError' &&
    'code' in error
  );
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isHttpExceptionResponse(
  value: unknown,
): value is HttpExceptionResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('message' in value || 'error' in value || 'statusCode' in value)
  );
}

export function isXRayMessage(value: unknown): value is XRayMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return Object.entries(obj).every(([key, deviceData]) => {
    if (typeof key !== 'string') return false;
    if (typeof deviceData !== 'object' || deviceData === null) return false;

    const data = deviceData as Record<string, unknown>;

    if (!Array.isArray(data.data) || typeof data.time !== 'number') {
      return false;
    }

    return data.data.every((point) => {
      if (!Array.isArray(point) || point.length !== 2) return false;
      const timestamp = point[0] as unknown;
      const coords = point[1] as unknown;

      return (
        typeof timestamp === 'number' &&
        Array.isArray(coords) &&
        coords.length === 3 &&
        coords.every((c) => typeof c === 'number')
      );
    });
  });
}

export interface MongoConnection extends Connection {
  on(event: 'connected', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'disconnected', listener: () => void): this;
}
