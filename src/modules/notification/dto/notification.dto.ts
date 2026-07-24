import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class NotificationCategoryPreferencesDto {
  @IsOptional()
  @IsBoolean()
  reminders?: boolean;

  @IsOptional()
  @IsBoolean()
  taskWorkflow?: boolean;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsBoolean()
  errorsWarnings?: boolean;

  @IsOptional()
  @IsBoolean()
  messagesActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  accountSecurity?: boolean;

  @IsOptional()
  @IsBoolean()
  productSystem?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  browserEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationCategoryPreferencesDto)
  categories?: NotificationCategoryPreferencesDto;

  @IsOptional()
  @IsBoolean()
  immediateEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  groupingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Length(5, 5)
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  @Length(5, 5)
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  detailedPreviewEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  suppressDuplicatesEnabled?: boolean;
}

export class RegisterPushSubscriptionDto {
  @IsUUID()
  deviceId: string;

  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
    },
    { message: 'Push endpoint must be a secure HTTPS URL' },
  )
  endpoint: string;

  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;

  @IsIn(['default', 'denied', 'granted'])
  permission: 'default' | 'denied' | 'granted';
}

export class RevokePushSubscriptionDto {
  @IsUUID()
  deviceId: string;
}

export class ScheduleReminderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  destinationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  dedupeKey?: string;
}

export class NotificationEventVariablesDto {
  @IsObject()
  variables: Record<string, string>;
}
