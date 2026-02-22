import { SetMetadata } from '@nestjs/common';
import { NO_TRANSFORM_KEY } from '../interceptors/transform.interceptor';

/**
 * Decorator to skip automatic response transformation
 *
 * Use this decorator on controller methods that:
 * - Return file downloads/streams
 * - Need custom response format (e.g., auth endpoints setting cookies)
 * - Already return properly formatted responses
 *
 * Example:
 * @NoTransform()
 * @Post('signin')
 * async signin(@Res() res: Response) {
 *   // Custom response handling
 * }
 */
export const NoTransform = () => SetMetadata(NO_TRANSFORM_KEY, true);
