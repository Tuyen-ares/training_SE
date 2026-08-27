import type { NotificationIntent } from '@/notifications/domain-event.js';
import type {
  RecipientRepository,
  ResolvedRecipient,
} from '@/notifications/repositories.js';

export class PermanentRecipientError extends Error {
  readonly permanent = true;
}
export class RecipientResolver {
  constructor(private readonly repository: RecipientRepository) {}
  async resolve(intent: NotificationIntent): Promise<ResolvedRecipient[]> {
    if (intent.recipient.kind === 'DIRECT_USER') {
      const recipient = await this.repository.findDirect(
        intent.recipient.userId,
      );
      if (!recipient)
        throw new PermanentRecipientError(
          `DIRECT_RECIPIENT_NOT_FOUND:${intent.recipient.userId}`,
        );
      return [recipient];
    }
    const recipients = await this.repository.findActiveByPermissions(
      intent.recipient.permissionCodes,
      intent.recipient.excludedUserIds,
    );
    return [...new Map(recipients.map((user) => [user.userId, user])).values()];
  }
}
