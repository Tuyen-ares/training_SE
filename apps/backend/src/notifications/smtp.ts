import nodemailer from 'nodemailer';
import type { ClaimedDelivery } from '@/notifications/repositories.js';
import type { DomainEventType } from '@/notifications/domain-event.js';
import { NotificationTemplateCatalog } from '@/notifications/template-catalog.js';
import type {
  DeliveryHandler,
  DeliveryOutcome,
} from '@/notifications/delivery.js';

export interface EmailProvider {
  send(input: EmailMessage): Promise<{ providerMessageId?: string }>;
  close(): Promise<void>;
}
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string | null;
  messageId: string;
}
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}
export type SmtpConfigResult =
  | { state: 'DISABLED' }
  | { state: 'MISCONFIGURED'; error: string }
  | { state: 'READY'; config: SmtpConfig };

const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const emailDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function formatVietnamEmailDate(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new RangeError('Invalid email date');
  const parts = Object.fromEntries(
    emailDateFormatter
      .formatToParts(value)
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year} ${parts.hour}:${parts.minute}:${parts.second} +0700`;
}

export function buildSmtpMessage(
  config: Pick<SmtpConfig, 'from'>,
  input: EmailMessage,
  now = new Date(),
) {
  return {
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? undefined,
    messageId: input.messageId,
    date: formatVietnamEmailDate(now),
  };
}

export class NodemailerEmailProvider implements EmailProvider {
  private readonly transporter;
  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? { user: config.user, pass: config.password }
        : undefined,
      pool: true,
    });
  }
  async send(input: Parameters<EmailProvider['send']>[0]) {
    const result = await this.transporter.sendMail(
      buildSmtpMessage(this.config, input),
    );
    return { providerMessageId: result.messageId };
  }
  async close() {
    this.transporter.close();
  }
}
export function readSmtpConfig(env: NodeJS.ProcessEnv): SmtpConfigResult {
  if (env.SMTP_ENABLED !== 'true') return { state: 'DISABLED' };
  if (!env.SMTP_HOST?.trim())
    return { state: 'MISCONFIGURED', error: 'SMTP_HOST_REQUIRED' };
  if (!env.SMTP_FROM?.trim())
    return { state: 'MISCONFIGURED', error: 'SMTP_FROM_REQUIRED' };
  const port = Number(env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    return { state: 'MISCONFIGURED', error: 'SMTP_PORT_INVALID' };
  const secureValue = env.SMTP_SECURE ?? 'false';
  if (secureValue !== 'true' && secureValue !== 'false')
    return { state: 'MISCONFIGURED', error: 'SMTP_SECURE_INVALID' };
  const hasUser = Boolean(env.SMTP_USER?.trim());
  const hasPassword = Boolean(env.SMTP_PASSWORD);
  if (hasUser !== hasPassword)
    return { state: 'MISCONFIGURED', error: 'SMTP_AUTH_INCOMPLETE' };
  return {
    state: 'READY',
    config: {
      host: env.SMTP_HOST.trim(),
      port,
      secure: secureValue === 'true',
      user: hasUser ? env.SMTP_USER!.trim() : undefined,
      password: hasPassword ? env.SMTP_PASSWORD : undefined,
      from: env.SMTP_FROM.trim(),
    },
  };
}
export function classifySmtpError(
  error: any,
  clean: (value: unknown) => string,
): DeliveryOutcome {
  const message = clean(error);
  const code = String(error?.code ?? '').toUpperCase();
  const responseCode = Number(error?.responseCode ?? 0);
  if (code === 'EAUTH' || code.includes('AUTH'))
    return { kind: 'RELEASE_AND_ABORT', error: message, cooldownMs: 30_000 };
  if (
    [
      'ETIMEDOUT',
      'ECONNECTION',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
    ].includes(code) ||
    (responseCode >= 400 && responseCode < 500)
  )
    return { kind: 'RETRY', error: message };
  if (responseCode >= 500 && responseCode < 600)
    return { kind: 'FAILED', error: message };
  return { kind: 'RETRY', error: message };
}
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export class SmtpEmailDeliveryHandler implements DeliveryHandler {
  readonly channel = 'EMAIL' as const;
  constructor(
    private readonly provider: EmailProvider | null,
    private readonly enabled: boolean,
    private readonly cleanError: (value: unknown) => string,
    private readonly templates = new NotificationTemplateCatalog(),
  ) {}
  async process(delivery: ClaimedDelivery): Promise<DeliveryOutcome> {
    if (!this.enabled) return { kind: 'SKIPPED', reason: 'SMTP_DISABLED' };
    if (!delivery.recipientAddress)
      return { kind: 'SKIPPED', reason: 'EMAIL_MISSING' };
    if (!validEmail(delivery.recipientAddress))
      return { kind: 'SKIPPED', reason: 'EMAIL_INVALID' };
    if (!this.provider)
      return {
        kind: 'RELEASE_AND_ABORT',
        error: 'SMTP_CONFIG_MISSING',
        cooldownMs: 30_000,
      };
    if (!delivery.outboundMessageId)
      return { kind: 'FAILED', error: 'SMTP_MESSAGE_ID_MISSING' };
    try {
      const rendered = this.renderDelivery(delivery);
      const result = await this.provider.send({
        to: delivery.recipientAddress,
        subject: rendered.title,
        text: rendered.text,
        html: rendered.html,
        messageId: delivery.outboundMessageId,
      });
      return { kind: 'SENT', providerMessageId: result.providerMessageId };
    } catch (error) {
      return classifySmtpError(error, this.cleanError);
    }
  }

  private renderDelivery(delivery: ClaimedDelivery) {
    const payload = delivery.messagePayload;
    if (
      delivery.eventType &&
      delivery.templateVersion &&
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload)
    ) {
      const values = payload as Record<string, unknown>;
      const deepLink =
        typeof values.deepLink === 'string' ? values.deepLink : null;
      return this.templates.render(
        delivery.eventType as DomainEventType,
        delivery.templateVersion,
        values,
        deepLink,
      );
    }
    return this.templates.render(
      delivery.eventType ?? 'legacy',
      delivery.templateVersion ?? 1,
      { title: delivery.title, message: delivery.text },
      null,
    );
  }
}
