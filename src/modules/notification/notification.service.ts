import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import * as webPush from 'web-push';
import {
  NotificationConfig,
  NotificationConfigName,
} from '../../config/notification.config';
import {
  RegisterPushSubscriptionDto,
  ScheduleReminderDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification.dto';
import { NotificationDeliveryAttempt } from './entities/notification-delivery-attempt.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import {
  Notification,
  NotificationAction,
} from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import {
  DEFAULT_NOTIFICATION_DESTINATION,
  GENERIC_NOTIFICATION_PREVIEW,
  MAX_PUSH_RETRY_ATTEMPTS,
  NOTIFICATION_DUPLICATE_WINDOW_MS,
  NOTIFICATION_EVENT_REGISTRY,
  NOTIFICATION_POLL_INTERVAL_MS,
  NotificationCategory,
  NotificationEventType,
} from './notification.constants';
import { SubscriptionCryptoService } from './subscription-crypto.service';

export type CreateNotificationEventInput = {
  actions?: NotificationAction[];
  dedupeKey?: string;
  destinationUrl?: string;
  eventType: NotificationEventType;
  message?: string;
  metadata?: Record<string, string>;
  scheduledAt?: Date;
  title?: string;
  userId: string;
  variables?: Record<string, string>;
};

type BrowserPushPayload = {
  actions: NotificationAction[];
  badge: string;
  body: string;
  category: NotificationCategory;
  icon: string;
  id: string;
  renotify: boolean;
  requireInteraction: boolean;
  silent: boolean;
  tag: string;
  timestamp: string;
  title: string;
  url: string;
};

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private schedulerHandle: NodeJS.Timeout | null = null;
  private vapidConfigured = false;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
    @InjectRepository(NotificationDeliveryAttempt)
    private readonly deliveryAttemptRepository: Repository<NotificationDeliveryAttempt>,
    private readonly configService: ConfigService,
    private readonly subscriptionCryptoService: SubscriptionCryptoService,
  ) {
    this.configureVapid();
  }

  onModuleInit(): void {
    this.schedulerHandle = setInterval(() => {
      void this.deliverDueNotifications();
    }, NOTIFICATION_POLL_INTERVAL_MS);
    this.schedulerHandle.unref();
    void this.deliverDueNotifications();
  }

  onModuleDestroy(): void {
    if (this.schedulerHandle) {
      clearInterval(this.schedulerHandle);
      this.schedulerHandle = null;
    }
  }

  getBrowserConfiguration() {
    const config =
      this.configService.get<NotificationConfig>(NotificationConfigName);

    return {
      publicKey: this.vapidConfigured ? config?.vapidPublicKey : null,
      supported: this.vapidConfigured,
    };
  }

  async getPreferences(userId: string) {
    const preference = await this.getOrCreatePreferences(userId);
    return this.mapPreferences(preference);
  }

  async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesDto,
  ) {
    this.validateTime(input.quietHoursStart);
    this.validateTime(input.quietHoursEnd);
    this.validateTimezone(input.timezone);

    const preference = await this.getOrCreatePreferences(userId);
    const categories = input.categories;

    Object.assign(preference, {
      ...(input.browserEnabled !== undefined && {
        browserEnabled: input.browserEnabled,
      }),
      ...(input.immediateEnabled !== undefined && {
        immediateEnabled: input.immediateEnabled,
      }),
      ...(input.groupingEnabled !== undefined && {
        groupingEnabled: input.groupingEnabled,
      }),
      ...(input.quietHoursEnabled !== undefined && {
        quietHoursEnabled: input.quietHoursEnabled,
      }),
      ...(input.quietHoursStart && {
        quietHoursStart: input.quietHoursStart,
      }),
      ...(input.quietHoursEnd && {
        quietHoursEnd: input.quietHoursEnd,
      }),
      ...(input.timezone && { timezone: input.timezone }),
      ...(input.soundEnabled !== undefined && {
        soundEnabled: input.soundEnabled,
      }),
      ...(input.detailedPreviewEnabled !== undefined && {
        detailedPreviewEnabled: input.detailedPreviewEnabled,
      }),
      ...(input.suppressDuplicatesEnabled !== undefined && {
        suppressDuplicatesEnabled: input.suppressDuplicatesEnabled,
      }),
      ...(categories?.reminders !== undefined && {
        remindersEnabled: categories.reminders,
      }),
      ...(categories?.taskWorkflow !== undefined && {
        taskWorkflowEnabled: categories.taskWorkflow,
      }),
      ...(categories?.success !== undefined && {
        successEnabled: categories.success,
      }),
      ...(categories?.errorsWarnings !== undefined && {
        errorsWarningsEnabled: categories.errorsWarnings,
      }),
      ...(categories?.messagesActivity !== undefined && {
        messagesActivityEnabled: categories.messagesActivity,
      }),
      ...(categories?.accountSecurity !== undefined && {
        accountSecurityEnabled: categories.accountSecurity,
      }),
      ...(categories?.productSystem !== undefined && {
        productSystemEnabled: categories.productSystem,
      }),
    });

    const savedPreference =
      await this.preferenceRepository.save(preference);
    return this.mapPreferences(savedPreference);
  }

  async registerSubscription(
    userId: string,
    input: RegisterPushSubscriptionDto,
    userAgent?: string,
  ) {
    if (!this.vapidConfigured) {
      throw new ServiceUnavailableException(
        'Browser notifications are unavailable',
      );
    }

    const endpointHash =
      this.subscriptionCryptoService.hashEndpoint(input.endpoint);
    const endpointOwner = await this.subscriptionRepository.findOne({
      where: { endpointHash },
    });

    if (
      endpointOwner &&
      endpointOwner.userId !== userId &&
      !endpointOwner.revokedAt
    ) {
      throw new ConflictException(
        'This browser subscription belongs to another account',
      );
    }

    const existing = await this.subscriptionRepository.findOne({
      where: { deviceId: input.deviceId, userId },
    });
    const subscription =
      existing ??
      (endpointOwner?.userId === userId
        ? endpointOwner
        : this.subscriptionRepository.create());

    Object.assign(subscription, {
      authEncrypted: this.subscriptionCryptoService.encrypt(input.auth),
      deviceId: input.deviceId,
      endpointEncrypted: this.subscriptionCryptoService.encrypt(
        input.endpoint,
      ),
      endpointHash,
      failureCount: 0,
      lastFailureAt: null,
      lastUsedAt: new Date(),
      p256dhEncrypted: this.subscriptionCryptoService.encrypt(input.p256dh),
      permission: input.permission,
      revokedAt: null,
      userAgent: this.sanitizeUserAgent(userAgent),
      userId,
    });

    if (endpointOwner && endpointOwner.userId !== userId) {
      await this.subscriptionRepository.remove(endpointOwner);
    }

    await this.subscriptionRepository.save(subscription);
    const preference = await this.getOrCreatePreferences(userId);
    if (!preference.browserEnabled) {
      preference.browserEnabled = true;
      await this.preferenceRepository.save(preference);
    }

    return {
      deviceId: subscription.deviceId,
      registered: true,
    };
  }

  async revokeSubscription(userId: string, deviceId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { deviceId, userId },
    });

    if (subscription && !subscription.revokedAt) {
      subscription.revokedAt = new Date();
      subscription.permission = 'denied';
      await this.subscriptionRepository.save(subscription);
    }

    return { revoked: true };
  }

  async listNotifications(userId: string, limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        order: { createdAt: 'DESC' },
        skip: safeOffset,
        take: safeLimit,
        where: { userId },
      });

    const unreadCount = await this.notificationRepository.count({
      where: { readAt: IsNull(), userId },
    });

    return {
      items: notifications.map((notification) =>
        this.mapNotification(notification),
      ),
      pagination: {
        hasMore: safeOffset + notifications.length < total,
        limit: safeLimit,
        offset: safeOffset,
        total,
      },
      unreadCount,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { readAt: IsNull(), userId },
    });
    return { count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.getOwnedNotification(
      userId,
      notificationId,
    );
    notification.readAt = notification.readAt ?? new Date();
    return this.mapNotification(
      await this.notificationRepository.save(notification),
    );
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();

    return { updated: true };
  }

  async markDismissed(userId: string, notificationId: string) {
    const notification = await this.getOwnedNotification(
      userId,
      notificationId,
    );
    notification.dismissedAt = notification.dismissedAt ?? new Date();
    await this.notificationRepository.save(notification);
    return { dismissed: true };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.getOwnedNotification(
      userId,
      notificationId,
    );
    await this.notificationRepository.remove(notification);
    return { deleted: true };
  }

  async clearNotifications(userId: string) {
    await this.notificationRepository.delete({ userId });
    return { cleared: true };
  }

  async scheduleReminder(userId: string, input: ScheduleReminderDto) {
    const scheduledAt = new Date(input.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Reminder must be scheduled in the future');
    }

    return this.createEvent({
      dedupeKey: input.dedupeKey,
      destinationUrl: input.destinationUrl,
      eventType: NotificationEventType.REMINDER_UPCOMING,
      message: input.message,
      scheduledAt,
      title: input.title,
      userId,
    });
  }

  async createEvent(input: CreateNotificationEventInput) {
    const definition = NOTIFICATION_EVENT_REGISTRY[input.eventType];
    if (!definition) {
      throw new BadRequestException('Unsupported notification event');
    }

    const preference = await this.getOrCreatePreferences(input.userId);
    const dedupeKey = this.sanitizeDedupeKey(input.dedupeKey);
    if (dedupeKey && preference.suppressDuplicatesEnabled) {
      const duplicate = await this.notificationRepository.findOne({
        order: { createdAt: 'DESC' },
        where: {
          createdAt: MoreThan(
            new Date(Date.now() - NOTIFICATION_DUPLICATE_WINDOW_MS),
          ),
          dedupeKey,
          userId: input.userId,
        },
      });
      if (duplicate) {
        return this.mapNotification(duplicate);
      }
    }

    const now = new Date();
    const scheduledAt =
      input.scheduledAt ??
      (!preference.immediateEnabled
        ? new Date(now.getTime() + 5 * 60 * 1000)
        : now);
    const notification = this.notificationRepository.create({
      actions: this.sanitizeActions(input.actions),
      category: definition.category,
      critical: definition.critical ?? false,
      dedupeKey,
      destinationUrl: this.sanitizeDestination(input.destinationUrl),
      eventType: input.eventType,
      message: this.sanitizeContent(
        input.message ??
          this.interpolate(definition.defaultMessage, input.variables),
        1000,
      ),
      metadata: this.sanitizeMetadata(input.metadata),
      scheduledAt,
      silent: false,
      title: this.sanitizeContent(
        input.title ??
          this.interpolate(definition.defaultTitle, input.variables),
        160,
      ),
      userId: input.userId,
    });
    const saved = await this.notificationRepository.save(notification);

    if (!scheduledAt || scheduledAt.getTime() <= now.getTime()) {
      void this.deliverNotification(saved.id).catch((error: unknown) => {
        this.logger.error(
          `Notification delivery failed: ${this.getErrorCode(error)}`,
        );
      });
    }

    return this.mapNotification(saved);
  }

  private configureVapid(): void {
    const config =
      this.configService.get<NotificationConfig>(NotificationConfigName);
    if (
      !config?.vapidPublicKey ||
      !config.vapidPrivateKey ||
      !config.vapidSubject
    ) {
      this.logger.warn(
        'VAPID keys are not configured; in-app notifications remain available',
      );
      return;
    }

    try {
      webPush.setVapidDetails(
        config.vapidSubject,
        config.vapidPublicKey,
        config.vapidPrivateKey,
      );
      this.vapidConfigured = true;
    } catch {
      this.logger.error(
        'VAPID configuration is invalid; browser push delivery is disabled',
      );
    }
  }

  private async deliverDueNotifications(): Promise<void> {
    const dueNotifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.delivered_at IS NULL')
      .andWhere('notification.scheduled_at IS NOT NULL')
      .andWhere('notification.scheduled_at <= :now', { now: new Date() })
      .orderBy('notification.scheduled_at', 'ASC')
      .take(100)
      .getMany();

    await Promise.allSettled(
      dueNotifications.map((notification) =>
        this.deliverNotification(notification.id),
      ),
    );
  }

  private async deliverNotification(notificationId: string): Promise<void> {
    const claim = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ deliveredAt: new Date() })
      .where('id = :notificationId', { notificationId })
      .andWhere('delivered_at IS NULL')
      .execute();

    if (!claim.affected) {
      return;
    }

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });
    if (!notification || !this.vapidConfigured) {
      return;
    }

    const preference = await this.getOrCreatePreferences(notification.userId);
    if (
      !preference.browserEnabled ||
      !this.isCategoryEnabled(notification.category, preference)
    ) {
      return;
    }

    const subscriptions = await this.subscriptionRepository.find({
      where: { revokedAt: IsNull(), userId: notification.userId },
    });
    if (subscriptions.length === 0) {
      return;
    }

    const quietHoursActive =
      !notification.critical &&
      preference.quietHoursEnabled &&
      this.isWithinQuietHours(preference);
    notification.silent =
      quietHoursActive || !preference.soundEnabled;
    await this.notificationRepository.save(notification);
    const definition =
      NOTIFICATION_EVENT_REGISTRY[notification.eventType];
    const payload = this.buildPushPayload(notification, preference);

    await Promise.allSettled(
      subscriptions.map((subscription) =>
        this.sendToSubscription({
          notification,
          payload,
          subscription,
          ttlSeconds: definition.ttlSeconds,
        }),
      ),
    );
  }

  private async sendToSubscription(options: {
    notification: Notification;
    payload: BrowserPushPayload;
    subscription: PushSubscription;
    ttlSeconds: number;
  }): Promise<void> {
    const endpoint = this.subscriptionCryptoService.decrypt(
      options.subscription.endpointEncrypted,
    );
    const pushSubscription: webPush.PushSubscription = {
      endpoint,
      keys: {
        auth: this.subscriptionCryptoService.decrypt(
          options.subscription.authEncrypted,
        ),
        p256dh: this.subscriptionCryptoService.decrypt(
          options.subscription.p256dhEncrypted,
        ),
      },
    };

    for (let attempt = 1; attempt <= MAX_PUSH_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const result = await webPush.sendNotification(
          pushSubscription,
          JSON.stringify(options.payload),
          {
            TTL: options.ttlSeconds,
            topic: this.buildPushTopic(options.payload.tag),
            urgency: options.notification.critical ? 'high' : 'normal',
          },
        );
        await this.deliveryAttemptRepository.save(
          this.deliveryAttemptRepository.create({
            attempt,
            errorCode: null,
            notificationId: options.notification.id,
            status: 'delivered',
            statusCode: result.statusCode,
            subscriptionId: options.subscription.id,
          }),
        );
        options.subscription.failureCount = 0;
        options.subscription.lastFailureAt = null;
        options.subscription.lastUsedAt = new Date();
        await this.subscriptionRepository.save(options.subscription);
        return;
      } catch (error) {
        const statusCode =
          error instanceof webPush.WebPushError
            ? error.statusCode
            : null;
        const permanentFailure = statusCode === 404 || statusCode === 410;
        const retryable =
          !permanentFailure &&
          (statusCode === null ||
            statusCode === 408 ||
            statusCode === 429 ||
            statusCode >= 500);
        const willRetry =
          retryable && attempt < MAX_PUSH_RETRY_ATTEMPTS;

        await this.deliveryAttemptRepository.save(
          this.deliveryAttemptRepository.create({
            attempt,
            errorCode: this.getErrorCode(error),
            notificationId: options.notification.id,
            status: willRetry ? 'retrying' : 'failed',
            statusCode,
            subscriptionId: options.subscription.id,
          }),
        );

        options.subscription.failureCount += 1;
        options.subscription.lastFailureAt = new Date();
        if (permanentFailure) {
          options.subscription.revokedAt = new Date();
        }
        await this.subscriptionRepository.save(options.subscription);

        if (!willRetry) {
          return;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, attempt * 350),
        );
      }
    }
  }

  private buildPushPayload(
    notification: Notification,
    preference: NotificationPreference,
  ): BrowserPushPayload {
    const tag = preference.groupingEnabled
      ? notification.category
      : notification.id;

    return {
      actions: notification.actions,
      badge: '/favicon-32x32.png',
      body: preference.detailedPreviewEnabled
        ? notification.message
        : GENERIC_NOTIFICATION_PREVIEW,
      category: notification.category,
      icon: '/viargos-favicon.png',
      id: notification.id,
      renotify: !preference.suppressDuplicatesEnabled,
      requireInteraction: notification.critical,
      silent: notification.silent,
      tag,
      timestamp: notification.createdAt.toISOString(),
      title: notification.title,
      url: notification.destinationUrl,
    };
  }

  private buildPushTopic(tag: string): string {
    return createHash('sha256').update(tag).digest('base64url').slice(0, 32);
  }

  private isCategoryEnabled(
    category: NotificationCategory,
    preference: NotificationPreference,
  ): boolean {
    const categoryPreferenceMap: Record<NotificationCategory, boolean> = {
      [NotificationCategory.ACCOUNT_SECURITY]:
        preference.accountSecurityEnabled,
      [NotificationCategory.ERRORS_WARNINGS]:
        preference.errorsWarningsEnabled,
      [NotificationCategory.MESSAGES_ACTIVITY]:
        preference.messagesActivityEnabled,
      [NotificationCategory.PRODUCT_SYSTEM]:
        preference.productSystemEnabled,
      [NotificationCategory.REMINDERS]: preference.remindersEnabled,
      [NotificationCategory.SUCCESS]: preference.successEnabled,
      [NotificationCategory.TASK_WORKFLOW]:
        preference.taskWorkflowEnabled,
    };
    return categoryPreferenceMap[category];
  }

  private isWithinQuietHours(
    preference: NotificationPreference,
  ): boolean {
    const minutes = this.getMinutesInTimezone(
      new Date(),
      preference.timezone,
    );
    const start = this.parseTime(preference.quietHoursStart);
    const end = this.parseTime(preference.quietHoursEnd);

    if (start === end) {
      return true;
    }
    if (start < end) {
      return minutes >= start && minutes < end;
    }
    return minutes >= start || minutes < end;
  }

  private getMinutesInTimezone(date: Date, timezone: string): number {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        hourCycle: 'h23',
        minute: '2-digit',
        timeZone: timezone,
      }).formatToParts(date);
      const hour = Number(parts.find((part) => part.type === 'hour')?.value);
      const minute = Number(
        parts.find((part) => part.type === 'minute')?.value,
      );
      return hour * 60 + minute;
    } catch {
      return date.getUTCHours() * 60 + date.getUTCMinutes();
    }
  }

  private async getOrCreatePreferences(
    userId: string,
  ): Promise<NotificationPreference> {
    const existing = await this.preferenceRepository.findOne({
      where: { userId },
    });
    if (existing) {
      return existing;
    }

    await this.preferenceRepository.upsert({ userId }, ['userId']);
    return this.preferenceRepository.findOneOrFail({ where: { userId } });
  }

  private async getOwnedNotification(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  private mapNotification(notification: Notification) {
    return {
      actions: notification.actions,
      category: notification.category,
      createdAt: notification.createdAt,
      destinationUrl: notification.destinationUrl,
      dismissedAt: notification.dismissedAt,
      eventType: notification.eventType,
      id: notification.id,
      isRead: Boolean(notification.readAt),
      message: notification.message,
      readAt: notification.readAt,
      scheduledAt: notification.scheduledAt,
      title: notification.title,
    };
  }

  private mapPreferences(preference: NotificationPreference) {
    return {
      browserEnabled: preference.browserEnabled,
      categories: {
        accountSecurity: preference.accountSecurityEnabled,
        errorsWarnings: preference.errorsWarningsEnabled,
        messagesActivity: preference.messagesActivityEnabled,
        productSystem: preference.productSystemEnabled,
        reminders: preference.remindersEnabled,
        success: preference.successEnabled,
        taskWorkflow: preference.taskWorkflowEnabled,
      },
      detailedPreviewEnabled: preference.detailedPreviewEnabled,
      groupingEnabled: preference.groupingEnabled,
      immediateEnabled: preference.immediateEnabled,
      quietHoursEnabled: preference.quietHoursEnabled,
      quietHoursEnd: preference.quietHoursEnd.slice(0, 5),
      quietHoursStart: preference.quietHoursStart.slice(0, 5),
      soundEnabled: preference.soundEnabled,
      suppressDuplicatesEnabled: preference.suppressDuplicatesEnabled,
      timezone: preference.timezone,
    };
  }

  private sanitizeActions(
    actions: NotificationAction[] | undefined,
  ): NotificationAction[] {
    if (!actions) {
      return [];
    }
    return actions.slice(0, 2).map((action) => ({
      action: this.sanitizeContent(action.action, 32)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-'),
      title: this.sanitizeContent(action.title, 48),
      ...(action.url && {
        url: this.sanitizeDestination(action.url),
      }),
    }));
  }

  private sanitizeContent(value: string, maxLength: number): string {
    return value
      .replace(/<[^>]*>/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  private sanitizeDedupeKey(value?: string): string | null {
    if (!value) {
      return null;
    }
    return value.replace(/[^a-zA-Z0-9:._-]/g, '').slice(0, 180) || null;
  }

  private sanitizeDestination(value?: string): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return DEFAULT_NOTIFICATION_DESTINATION;
    }

    try {
      const destination = new URL(value, 'https://viargos.invalid');
      const forbiddenParameters = [
        'access_token',
        'auth',
        'code',
        'refresh_token',
        'session',
        'token',
      ];
      for (const parameter of forbiddenParameters) {
        destination.searchParams.delete(parameter);
      }
      return `${destination.pathname}${destination.search}${destination.hash}`.slice(
        0,
        2048,
      );
    } catch {
      return DEFAULT_NOTIFICATION_DESTINATION;
    }
  }

  private sanitizeMetadata(
    metadata?: Record<string, string>,
  ): Record<string, string> | null {
    if (!metadata) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(metadata)
        .slice(0, 20)
        .map(([key, value]) => [
          key.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 64),
          this.sanitizeContent(String(value), 300),
        ])
        .filter(([key]) => Boolean(key)),
    );
  }

  private sanitizeUserAgent(userAgent?: string): string | null {
    return userAgent ? this.sanitizeContent(userAgent, 512) : null;
  }

  private interpolate(
    template: string,
    variables?: Record<string, string>,
  ): string {
    return template.replace(
      /\{\{([a-zA-Z0-9_]+)\}\}/g,
      (_, key: string) => variables?.[key] ?? 'Your activity',
    );
  }

  private validateTime(value?: string): void {
    if (value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new BadRequestException('Quiet hours time is invalid');
    }
  }

  private validateTimezone(value?: string): void {
    if (!value) {
      return;
    }
    try {
      new Intl.DateTimeFormat('en', { timeZone: value }).format();
    } catch {
      throw new BadRequestException('Timezone is invalid');
    }
  }

  private parseTime(value: string): number {
    const [hour, minute] = value.slice(0, 5).split(':').map(Number);
    return hour * 60 + minute;
  }

  private getErrorCode(error: unknown): string {
    if (error instanceof webPush.WebPushError) {
      return `WEB_PUSH_${error.statusCode}`;
    }
    if (error instanceof Error) {
      return error.name.slice(0, 80);
    }
    return 'UNKNOWN_ERROR';
  }
}
