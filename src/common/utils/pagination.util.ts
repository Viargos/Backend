/**
 * Pagination utility functions
 */

import { PAGINATION } from '../constants';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CursorPaginationMeta {
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: CursorPaginationMeta;
}

export class PaginationUtil {
  /**
   * Validate and sanitize limit parameter
   */
  static validateLimit(limit?: number): number {
    if (!limit || limit < PAGINATION.MIN_LIMIT) {
      return PAGINATION.DEFAULT_LIMIT;
    }
    return Math.min(limit, PAGINATION.MAX_LIMIT);
  }

  /**
   * Validate and sanitize page parameter
   */
  static validatePage(page?: number): number {
    if (!page || page < 1) {
      return PAGINATION.DEFAULT_PAGE;
    }
    return page;
  }

  /**
   * Calculate offset for pagination
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calculate total pages
   */
  static calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  /**
   * Create pagination metadata
   */
  static createPaginationMeta(
    total: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    const totalPages = this.calculateTotalPages(total, limit);

    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    return {
      data,
      meta: this.createPaginationMeta(total, page, limit),
    };
  }

  /**
   * Create cursor pagination metadata
   */
  static createCursorPaginationMeta(
    hasMore: boolean,
    nextCursor?: string,
    totalCount?: number,
  ): CursorPaginationMeta {
    return {
      hasMore,
      nextCursor,
      totalCount,
    };
  }

  /**
   * Create cursor paginated response
   */
  static createCursorPaginatedResponse<T>(
    data: T[],
    hasMore: boolean,
    nextCursor?: string,
    totalCount?: number,
  ): CursorPaginatedResponse<T> {
    return {
      data,
      meta: this.createCursorPaginationMeta(hasMore, nextCursor, totalCount),
    };
  }

  /**
   * Extract pagination params from query
   */
  static extractPaginationParams(query: any): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = this.validatePage(parseInt(query.page));
    const limit = this.validateLimit(parseInt(query.limit));
    const offset = this.calculateOffset(page, limit);

    return { page, limit, offset };
  }

  /**
   * Extract cursor pagination params from query
   */
  static extractCursorPaginationParams(query: any): {
    cursor?: string;
    limit: number;
  } {
    const cursor = query.cursor;
    const limit = this.validateLimit(parseInt(query.limit));

    return { cursor, limit };
  }
}
