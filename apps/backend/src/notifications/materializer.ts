import type {
  DomainEvent,
  NotificationIntent,
} from '@/notifications/domain-event.js';
import type {
  ClaimedOutbox,
  MaterializedDelivery,
  OutboxRepository,
} from '@/notifications/repositories.js';
import { RecipientResolver } from '@/notifications/recipient-resolver.js';
import { NotificationTemplateCatalog } from '@/notifications/template-catalog.js';

export class NotificationMaterializer {
  constructor(
    private readonly recipients: RecipientResolver,
    private readonly templates: NotificationTemplateCatalog,
    private readonly outbox: OutboxRepository,
    private readonly publicUrl: string,
  ) {}

  async materialize(
    claim: ClaimedOutbox,
    event: DomainEvent,
    intents: readonly NotificationIntent[],
  ): Promise<boolean> {
    const deliveries: MaterializedDelivery[] = [];
    for (const intent of intents) {
      const recipients = await this.recipients.resolve(intent);
      const deepLink = this.deepLink(intent);
      const eventPayload =
        typeof event.payload === 'object' &&
        event.payload !== null &&
        !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : {};
      const messagePayload = {
        ...eventPayload,
        ...intent.templateParams,
        actorUserId: event.actorUserId,
        occurredAt: event.occurredAt,
        deepLink,
      };
      const rendered = this.templates.renderText(
        event.eventType,
        intent.templateVersion,
        messagePayload,
      );
      for (const recipient of recipients)
        deliveries.push({
          recipient,
          intent,
          title: rendered.title,
          text: rendered.text,
          eventType: event.eventType,
          templateVersion: intent.templateVersion,
          messagePayload,
        });
    }
    return this.outbox.finalizeDispatch(claim, event, deliveries);
  }

  private deepLink(intent: NotificationIntent) {
    const base = this.publicUrl.replace(/\/$/, '');
    return base
      ? `${base}/${intent.relatedEntityType.toLowerCase().replaceAll('_', '-')}s/${intent.relatedEntityId}`
      : null;
  }
}
