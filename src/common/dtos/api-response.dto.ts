import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard pagination metadata for list endpoints
 */
export class PaginationMetadata {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Whether there are more items available' })
  hasMore: boolean;

  @ApiProperty({ description: 'Cursor for next page', required: false })
  nextCursor?: string;
}

/**
 * Standard success response wrapper for all API endpoints
 *
 * Usage:
 * - List endpoints: { data: T[] }
 * - Single entity endpoints: { data: T }
 * - Paginated endpoints: { data: T[], pagination: {...} }
 */
export class ApiDataResponse<T> {
  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Pagination metadata', required: false })
  pagination?: PaginationMetadata;
}

/**
 * Standard error response for all API endpoints
 */
export class ApiErrorResponse {
  @ApiProperty({ description: 'Error code (e.g., BAD_REQUEST, NOT_FOUND)' })
  error: string;

  @ApiProperty({ description: 'Human-readable error message' })
  message: string;

  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Additional error details (e.g., validation errors)', required: false })
  details?: any;
}
