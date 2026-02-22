import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

/**
 * Metadata key for marking responses that should not be transformed
 */
export const NO_TRANSFORM_KEY = 'noTransform';

/**
 * Transform Interceptor
 *
 * Automatically wraps all controller responses in the standard { data: T } format.
 *
 * Behavior:
 * - If response already has 'data' key → return as-is (already wrapped)
 * - If response has 'message' key only → return as-is (operation endpoint)
 * - If response is undefined/null → wrap in { data: null }
 * - Otherwise → wrap in { data: response }
 *
 * Special handling:
 * - Auth endpoints that set cookies can use @NoTransform() decorator to bypass
 * - File downloads should use @NoTransform() decorator
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if @NoTransform() decorator is present
    const noTransform = this.reflector.getAllAndOverride<boolean>(NO_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (noTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map(data => {
        // IMPORTANT: Check for legacy statusCode/message/data format FIRST
        // This needs to come before the generic 'data' in data check
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'data' in data
        ) {
          return {
            data: data.data,
            ...(data.pagination && { pagination: data.pagination }),
          };
        }

        // If response is already wrapped with 'data' key only, return as-is
        if (data && typeof data === 'object' && 'data' in data && !('statusCode' in data)) {
          return data;
        }

        // IMPORTANT: Check for auth endpoints BEFORE checking for message-only endpoints
        // If response has both 'user' and 'message' (auth endpoints), wrap appropriately
        if (data && typeof data === 'object' && 'user' in data && 'message' in data) {
          return { data: data.user };
        }

        // If response has 'message' key only (operation endpoints), return as-is
        if (data && typeof data === 'object' && 'message' in data && !('data' in data)) {
          return data;
        }

        // Wrap everything else in { data: ... }
        return { data };
      }),
    );
  }
}
