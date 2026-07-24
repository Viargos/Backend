export enum NotificationCategory {
  ACCOUNT_SECURITY = 'account_security',
  ERRORS_WARNINGS = 'errors_warnings',
  MESSAGES_ACTIVITY = 'messages_activity',
  PRODUCT_SYSTEM = 'product_system',
  REMINDERS = 'reminders',
  SUCCESS = 'success',
  TASK_WORKFLOW = 'task_workflow',
}

export enum NotificationEventType {
  ACCOUNT_SECURITY = 'account.security',
  ACTION_FAILED = 'action.failed',
  ATTENTION_REQUIRED = 'attention.required',
  DEADLINE_UPCOMING = 'deadline.upcoming',
  MESSAGE_NEW = 'message.new',
  OPERATION_SUCCEEDED = 'operation.succeeded',
  PROCESS_COMPLETED = 'process.completed',
  REMINDER_UPCOMING = 'reminder.upcoming',
  SOCIAL_COMMENT = 'social.comment',
  SOCIAL_FOLLOW = 'social.follow',
  SOCIAL_LIKE = 'social.like',
  SYSTEM_ANNOUNCEMENT = 'system.announcement',
  WORKFLOW_COMPLETED = 'workflow.completed',
}

export type NotificationEventDefinition = {
  category: NotificationCategory;
  critical?: boolean;
  defaultMessage: string;
  defaultTitle: string;
  ttlSeconds: number;
};

/**
 * Central registry for every application event that can create a notification.
 */
export const NOTIFICATION_EVENT_REGISTRY: Record<
  NotificationEventType,
  NotificationEventDefinition
> = {
  [NotificationEventType.ACCOUNT_SECURITY]: {
    category: NotificationCategory.ACCOUNT_SECURITY,
    critical: true,
    defaultMessage:
      'An important security update requires your attention.',
    defaultTitle: 'Security update',
    ttlSeconds: 86400,
  },
  [NotificationEventType.ACTION_FAILED]: {
    category: NotificationCategory.ERRORS_WARNINGS,
    defaultMessage: '{{action}} could not be completed.',
    defaultTitle: 'Action failed',
    ttlSeconds: 21600,
  },
  [NotificationEventType.ATTENTION_REQUIRED]: {
    category: NotificationCategory.ERRORS_WARNINGS,
    defaultMessage: '{{action}} needs your attention.',
    defaultTitle: 'Action required',
    ttlSeconds: 43200,
  },
  [NotificationEventType.DEADLINE_UPCOMING]: {
    category: NotificationCategory.REMINDERS,
    defaultMessage: '{{item}} is due soon.',
    defaultTitle: 'Upcoming deadline',
    ttlSeconds: 43200,
  },
  [NotificationEventType.MESSAGE_NEW]: {
    category: NotificationCategory.MESSAGES_ACTIVITY,
    defaultMessage: '{{actor}} sent you a message.',
    defaultTitle: 'New message',
    ttlSeconds: 21600,
  },
  [NotificationEventType.OPERATION_SUCCEEDED]: {
    category: NotificationCategory.SUCCESS,
    defaultMessage: '{{action}} finished successfully.',
    defaultTitle: 'Operation completed',
    ttlSeconds: 21600,
  },
  [NotificationEventType.PROCESS_COMPLETED]: {
    category: NotificationCategory.TASK_WORKFLOW,
    defaultMessage: '{{process}} has finished.',
    defaultTitle: 'Process completed',
    ttlSeconds: 43200,
  },
  [NotificationEventType.REMINDER_UPCOMING]: {
    category: NotificationCategory.REMINDERS,
    defaultMessage: '{{item}} is coming up.',
    defaultTitle: 'Reminder',
    ttlSeconds: 43200,
  },
  [NotificationEventType.SOCIAL_COMMENT]: {
    category: NotificationCategory.MESSAGES_ACTIVITY,
    defaultMessage: '{{actor}} commented on your post.',
    defaultTitle: 'New comment',
    ttlSeconds: 21600,
  },
  [NotificationEventType.SOCIAL_FOLLOW]: {
    category: NotificationCategory.MESSAGES_ACTIVITY,
    defaultMessage: '{{actor}} started following you.',
    defaultTitle: 'New follower',
    ttlSeconds: 21600,
  },
  [NotificationEventType.SOCIAL_LIKE]: {
    category: NotificationCategory.MESSAGES_ACTIVITY,
    defaultMessage: '{{actor}} liked your post.',
    defaultTitle: 'New like',
    ttlSeconds: 21600,
  },
  [NotificationEventType.SYSTEM_ANNOUNCEMENT]: {
    category: NotificationCategory.PRODUCT_SYSTEM,
    defaultMessage: '{{announcement}}',
    defaultTitle: 'Viargos announcement',
    ttlSeconds: 86400,
  },
  [NotificationEventType.WORKFLOW_COMPLETED]: {
    category: NotificationCategory.TASK_WORKFLOW,
    defaultMessage: '{{workflow}} has finished successfully.',
    defaultTitle: 'Workflow completed',
    ttlSeconds: 43200,
  },
};

export const DEFAULT_NOTIFICATION_DESTINATION = '/notifications';
export const GENERIC_NOTIFICATION_PREVIEW =
  'Open Viargos to view this notification.';
export const MAX_PUSH_RETRY_ATTEMPTS = 3;
export const NOTIFICATION_DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const NOTIFICATION_POLL_INTERVAL_MS = 30 * 1000;
