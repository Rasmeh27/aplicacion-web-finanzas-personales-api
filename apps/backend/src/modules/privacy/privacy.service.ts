import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { RecordConsentDto } from './dto/record-consent.dto';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';

type PrivacySettingsRow = {
  user_id: string;
  email_notifications: boolean;
  weekly_summary: boolean;
  budget_alerts: boolean;
  two_factor: boolean;
  marketing_consent: boolean;
  data_processing_consent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class PrivacyService {
  private ready: Promise<void> | null = null;

  constructor(private readonly dataSource: DataSource) {}

  async getSettings(userId: string) {
    await this.ensureTables();
    await this.ensureSettings(userId);
    const [row] = await this.dataSource.query<PrivacySettingsRow[]>(
      'select * from public.privacy_settings where user_id = $1',
      [userId],
    );

    return this.formatSettings(row);
  }

  async updateSettings(userId: string, dto: UpdatePrivacySettingsDto) {
    await this.ensureTables();
    await this.ensureSettings(userId);

    const current = await this.getSettings(userId);
    const next = {
      emailNotifications: dto.emailNotifications ?? current.emailNotifications,
      weeklySummary: dto.weeklySummary ?? current.weeklySummary,
      budgetAlerts: dto.budgetAlerts ?? current.budgetAlerts,
      twoFactor: dto.twoFactor ?? current.twoFactor,
      marketingConsent: dto.marketingConsent ?? current.marketingConsent,
    };

    const [row] = await this.dataSource.query<PrivacySettingsRow[]>(
      `
        update public.privacy_settings
        set
          email_notifications = $2,
          weekly_summary = $3,
          budget_alerts = $4,
          two_factor = $5,
          marketing_consent = $6,
          updated_at = now()
        where user_id = $1
        returning *
      `,
      [
        userId,
        next.emailNotifications,
        next.weeklySummary,
        next.budgetAlerts,
        next.twoFactor,
        next.marketingConsent,
      ],
    );

    await this.logAudit(userId, 'privacy.settings.updated', next);
    return this.formatSettings(row);
  }

  async recordConsent(userId: string, dto: RecordConsentDto) {
    await this.ensureTables();
    const consentType = dto.consentType.trim().toLowerCase();

    await this.dataSource.query(
      `
        insert into public.privacy_consents (id, user_id, consent_type, accepted, metadata, created_at)
        values ($1, $2, $3, $4, $5::jsonb, now())
      `,
      [randomUUID(), userId, consentType, dto.accepted, JSON.stringify(dto.metadata ?? {})],
    );

    if (consentType === 'data_processing' && dto.accepted) {
      await this.ensureSettings(userId);
      await this.dataSource.query(
        `
          update public.privacy_settings
          set data_processing_consent_at = coalesce(data_processing_consent_at, now()), updated_at = now()
          where user_id = $1
        `,
        [userId],
      );
    }

    await this.logAudit(userId, 'privacy.consent.recorded', {
      consentType,
      accepted: dto.accepted,
    });

    return { consentType, accepted: dto.accepted, recorded: true };
  }

  async listAudit(userId: string) {
    await this.ensureTables();
    return this.dataSource.query(
      `
        select id, action, metadata, created_at as "createdAt"
        from public.audit_logs
        where user_id = $1
        order by created_at desc
        limit 50
      `,
      [userId],
    );
  }

  async listNotifications(userId: string) {
    await this.ensureTables();
    return this.dataSource.query(
      `
        select id, type, title, message, read_at as "readAt", created_at as "createdAt"
        from public.notifications
        where user_id = $1
        order by created_at desc
        limit 50
      `,
      [userId],
    );
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.ensureTables();
    await this.dataSource.query(
      `
        update public.notifications
        set read_at = coalesce(read_at, now())
        where id = $1 and user_id = $2
      `,
      [notificationId, userId],
    );

    await this.logAudit(userId, 'notification.read', { notificationId });
    return { id: notificationId, read: true };
  }

  async logAudit(userId: string, action: string, metadata: Record<string, unknown> = {}) {
    await this.ensureTables();
    await this.dataSource.query(
      `
        insert into public.audit_logs (id, user_id, action, metadata, created_at)
        values ($1, $2, $3, $4::jsonb, now())
      `,
      [randomUUID(), userId, action, JSON.stringify(metadata)],
    );
  }

  private async ensureSettings(userId: string) {
    await this.dataSource.query(
      `
        insert into public.privacy_settings (user_id)
        values ($1)
        on conflict (user_id) do nothing
      `,
      [userId],
    );
  }

  private async ensureTables() {
    this.ready ??= this.createTables();
    await this.ready;
  }

  private async createTables() {
    await this.dataSource.query(`
      create table if not exists public.privacy_settings (
        user_id uuid primary key references public.profiles(id) on delete cascade,
        email_notifications boolean not null default true,
        weekly_summary boolean not null default true,
        budget_alerts boolean not null default false,
        two_factor boolean not null default false,
        marketing_consent boolean not null default false,
        data_processing_consent_at timestamptz null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await this.dataSource.query(`
      create table if not exists public.privacy_consents (
        id uuid primary key,
        user_id uuid not null references public.profiles(id) on delete cascade,
        consent_type text not null,
        accepted boolean not null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )
    `);

    await this.dataSource.query(`
      create table if not exists public.audit_logs (
        id uuid primary key,
        user_id uuid not null references public.profiles(id) on delete cascade,
        action text not null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )
    `);

    await this.dataSource.query(`
      create table if not exists public.notifications (
        id uuid primary key,
        user_id uuid not null references public.profiles(id) on delete cascade,
        type text not null default 'info',
        title text not null,
        message text not null,
        read_at timestamptz null,
        created_at timestamptz not null default now()
      )
    `);
  }

  private formatSettings(row: PrivacySettingsRow) {
    return {
      emailNotifications: row.email_notifications,
      weeklySummary: row.weekly_summary,
      budgetAlerts: row.budget_alerts,
      twoFactor: row.two_factor,
      marketingConsent: row.marketing_consent,
      dataProcessingConsentAt: row.data_processing_consent_at
        ? new Date(row.data_processing_consent_at).toISOString()
        : null,
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
