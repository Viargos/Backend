/**
 * Post-related enumerations
 */

export enum PostMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum PostSortBy {
  RECENT = 'RECENT',
  POPULAR = 'POPULAR',
  TRENDING = 'TRENDING',
  OLDEST = 'OLDEST',
}

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
}
