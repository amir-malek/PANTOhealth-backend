import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  isHttpException,
  isMongoServerError,
  isError,
  isHttpExceptionResponse,
} from '../types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Error';

    if (isHttpException(exception)) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (isHttpExceptionResponse(responseBody)) {
        const responseMessage = responseBody.message || exception.message;
        message = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage;
        error = responseBody.error || exception.name;
      } else {
        message = exception.message;
      }
    } else if (isError(exception)) {
      message = exception.message;
      error = exception.name;

      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        error = 'Validation Error';
      } else if (exception.name === 'CastError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid ID format';
        error = 'Cast Error';
      } else if (isMongoServerError(exception) && exception.code === 11000) {
        status = HttpStatus.CONFLICT;
        message = 'Duplicate entry';
        error = 'Conflict';
      }
    }

    this.logger.error(
      `HTTP ${status} Error - ${request.method} ${request.url} - ${message}`,
      isError(exception) ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message: Array.isArray(message) ? message : [message],
    });
  }
}
