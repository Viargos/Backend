import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_ERROR_CODES } from '../../../common/constants/error-codes.constants';

interface AuthErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  shouldRetry?: boolean;
}

@Catch(UnauthorizedException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || exception.message;

    // Check if refresh token exists (might be expired, but we check anyway)
    const refreshToken = (request as any).cookies?.['viargos_refresh_token'];

    let errorResponse: AuthErrorResponse;

    // Determine error type based on message or exception
    if (message.includes('expired') || message.includes('EXPIRED')) {
      // Access token expired - can retry if refresh token exists
      errorResponse = {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: AUTH_ERROR_CODES.TOKEN_EXPIRED,
        message: 'Access token expired',
        shouldRetry: !!refreshToken, // Can retry if refresh token exists
      };
    } else if (message.includes('REFRESH_EXPIRED')) {
      // Refresh token expired
      errorResponse = {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: AUTH_ERROR_CODES.REFRESH_EXPIRED,
        message: 'Session expired, please log in again',
        shouldRetry: false,
      };
    } else if (message.includes('REFRESH_REVOKED')) {
      // Refresh token revoked
      errorResponse = {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: AUTH_ERROR_CODES.REFRESH_REVOKED,
        message: 'Session was terminated',
        shouldRetry: false,
      };
    } else if (message.includes('REFRESH_INVALID')) {
      // Refresh token invalid
      errorResponse = {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: AUTH_ERROR_CODES.REFRESH_INVALID,
        message: 'Invalid session',
        shouldRetry: false,
      };
    } else if (message.includes('USER_INACTIVE')) {
      // User inactive
      errorResponse = {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: AUTH_ERROR_CODES.USER_INACTIVE,
        message: 'Your account is no longer active',
        shouldRetry: false,
      };
    } else {
      // Generic unauthorized
      errorResponse = {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: AUTH_ERROR_CODES.UNAUTHORIZED,
        message: message || 'Unauthorized access',
        shouldRetry: false,
      };
    }

    response.status(HttpStatus.UNAUTHORIZED).json(errorResponse);
  }
}
