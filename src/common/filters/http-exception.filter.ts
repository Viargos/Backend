import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '../dtos';

/**
 * Global HTTP Exception Filter
 *
 * Catches all exceptions and formats them into a standard error response:
 * {
 *   error: 'ERROR_CODE',
 *   message: 'Human-readable message',
 *   statusCode: 404,
 *   details: {} // optional validation errors
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    // Handle known HttpExceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = this.getErrorCode(status);

      const exceptionResponse = exception.getResponse();

      // Extract message from exception response
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;

        // Handle validation errors
        if (responseObj.message && Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          details = {
            validationErrors: responseObj.message,
          };
        } else if (responseObj.message) {
          message = responseObj.message;
        }

        // If there's an error field, use it as the error code
        if (responseObj.error) {
          error = responseObj.error;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      // Handle other errors
      message = exception.message || message;

      // Check if it's a database error
      if ('code' in exception) {
        const dbError = exception as any;
        if (dbError.code === '23505') {
          status = HttpStatus.CONFLICT;
          error = 'CONFLICT';
          message = 'Resource already exists';
        } else if (dbError.code === '23503') {
          status = HttpStatus.BAD_REQUEST;
          error = 'BAD_REQUEST';
          message = 'Referenced resource does not exist';
        }
      }
    }

    const errorResponse: ApiErrorResponse = {
      error,
      message,
      statusCode: status,
      ...(details && { details }),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Maps HTTP status codes to error code strings
   */
  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }
}
