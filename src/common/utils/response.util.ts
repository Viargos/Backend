/**
 * Response formatting utility functions
 */

import { HTTP_STATUS } from '../constants';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, any>;
  timestamp: string;
  path?: string;
}

export class ResponseUtil {
  /**
   * Create success response
   */
  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = HTTP_STATUS.OK,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create created response
   */
  static created<T>(data: T, message: string = 'Created'): ApiResponse<T> {
    return this.success(data, message, HTTP_STATUS.CREATED);
  }

  /**
   * Create no content response
   */
  static noContent(message: string = 'No content'): ApiResponse<null> {
    return {
      success: true,
      statusCode: HTTP_STATUS.NO_CONTENT,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create error response
   */
  static error(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors?: Record<string, any>,
    path?: string,
  ): ApiErrorResponse {
    return {
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Create bad request error response
   */
  static badRequest(
    message: string = 'Bad request',
    errors?: Record<string, any>,
  ): ApiErrorResponse {
    return this.error(message, HTTP_STATUS.BAD_REQUEST, errors);
  }

  /**
   * Create unauthorized error response
   */
  static unauthorized(
    message: string = 'Unauthorized',
  ): ApiErrorResponse {
    return this.error(message, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Create forbidden error response
   */
  static forbidden(
    message: string = 'Forbidden',
  ): ApiErrorResponse {
    return this.error(message, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Create not found error response
   */
  static notFound(
    message: string = 'Resource not found',
  ): ApiErrorResponse {
    return this.error(message, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Create conflict error response
   */
  static conflict(
    message: string = 'Resource already exists',
    errors?: Record<string, any>,
  ): ApiErrorResponse {
    return this.error(message, HTTP_STATUS.CONFLICT, errors);
  }

  /**
   * Create validation error response
   */
  static validationError(
    message: string = 'Validation failed',
    errors: Record<string, any>,
  ): ApiErrorResponse {
    return this.error(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
  }

  /**
   * Create internal server error response
   */
  static internalServerError(
    message: string = 'Internal server error',
  ): ApiErrorResponse {
    return this.error(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
