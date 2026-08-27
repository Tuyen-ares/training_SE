import type { DomainEventType } from '@/notifications/domain-event.js';

export type TemplateParams = Record<string, unknown>;

export interface RenderedTemplate {
  title: string;
  text: string;
  html: string;
}

export interface RenderedText {
  title: string;
  text: string;
}

export class UnsupportedTemplateError extends Error {
  readonly permanent = true;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (params: TemplateParams, key: string): string | null => {
  const value = params[key];
  return value === null || value === undefined || value === ''
    ? null
    : String(value);
};

const dateValue = (value: unknown): Date | null => {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateOnlyFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function formatDate(value: unknown, withTime = false): string {
  const date = dateValue(value);
  if (!date) return String(value ?? 'Unknown date');
  if (!withTime) return dateOnlyFormatter.format(date);
  const parts = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(date)
      .map(({ type, value: part }) => [type, part]),
  );
  return parts.hour + ':' + parts.minute + ' ' +
    parts.day + ' ' + parts.month + ' ' + parts.year;
}

function name(params: TemplateParams, key: string, fallback: string): string {
  return asText(params, key) ?? fallback;
}

function assetLabel(params: TemplateParams): string {
  const model = asText(params, 'assetModelName');
  const code = asText(params, 'assetCode');
  if (model && code) return model + ' – ' + code;
  return model ?? code ?? 'the requested asset';
}

function itemLabel(item: Record<string, unknown>): string {
  const model = item.assetModelName ? String(item.assetModelName) : null;
  const code = item.assetCode ? String(item.assetCode) : null;
  const asset = model && code ? model + ' – ' + code : model ?? code ?? 'asset';
  const detail = item.detailId ? 'detail #' + item.detailId : 'item';
  const date = item.expectedReturnDate
    ? ', expected return ' + formatDate(item.expectedReturnDate)
    : '';
  return detail + ': ' + asset + date;
}

function richBorrowTemplate(
  code: DomainEventType | string,
  params: TemplateParams,
): RenderedText | null {
  const requester = name(params, 'requesterName', 'there');
  const actor = name(params, 'actorName', 'the BigIn Asset team');
  const requestId = asText(params, 'requestId') ?? 'unknown';
  const asset = assetLabel(params);
  const detailId = asText(params, 'detailId');
  const detailReference = detailId ? ' (detail #' + detailId + ')' : '';

  if (code === 'borrow_request.created') {
    const items = Array.isArray(params.items)
      ? params.items.filter(isRecord).map(itemLabel)
      : [];
    const itemText = items.length
      ? 'Requested items:\n' + items.map((item) => '- ' + item).join('\n')
      : 'The request contains one or more asset items.';
    return {
      title: 'New borrow request',
      text:
        'Hello ' + requester + ',\n\n' +
        'Your borrow request #' + requestId + ' has been submitted for review.\n\n' +
        itemText + '\n\n' +
        'You will receive another notification when the request is processed.',
    };
  }

  if (code === 'borrow_request.approval_summary') {
    const items = Array.isArray(params.approvalItems)
      ? params.approvalItems.filter(isRecord)
      : [];
    const itemText = items.length
      ? items.map((item) => {
          const outcome = item.outcome === 'APPROVED' ? 'Approved' : 'Skipped';
          const reason = item.reason ? ' (' + item.reason + ')' : '';
          return '- ' + outcome + ': ' + itemLabel(item) + reason;
        }).join('\n')
      : 'No item result was recorded.';
    return {
      title: 'Borrow request approval summary',
      text:
        'Hello ' + requester + ',\n\n' +
        'Approve All has finished for borrow request #' + requestId + '.\n\n' +
        itemText + '\n\n' +
        'Reviewed by: ' + actor + '\n' +
        'Review time: ' + formatDate(params.occurredAt, true),
    };
  }

  if (
    code === 'borrow_request_detail.approved' ||
    code === 'borrow_request_detail.rejected'
  ) {
    const approved = code.endsWith('approved');
    const reason = asText(params, 'rejectionReason') ?? 'No reason was provided.';
    return {
      title: approved
        ? 'Borrow request item approved'
        : 'Borrow request item rejected',
      text:
        'Hello ' + requester + ',\n\n' +
        'The asset ' + asset + detailReference + ' in borrow request #' + requestId + '\n' +
        (approved
          ? 'has been approved by ' + actor + '.'
          : 'has been rejected by ' + actor + '.') + '\n\n' +
        (approved
          ? 'Approval time: ' + formatDate(params.occurredAt, true) + '\n' +
            'Expected return date: ' + formatDate(params.expectedReturnDate)
          : 'Rejection time: ' + formatDate(params.occurredAt, true) + '\n' +
            'Rejection reason: ' + reason),
    };
  }

  if (
    code === 'borrow_history.handed_over' ||
    code === 'borrow_history.returned' ||
    code === 'borrow_history.returned_damaged'
  ) {
    const damaged = code.endsWith('returned_damaged');
    const returned = code.includes('returned');
    const action = returned
      ? damaged
        ? 'has been returned with reported damage'
        : 'has been returned'
      : 'has been handed over';
    return {
      title: damaged
        ? 'Damaged asset return recorded'
        : returned
          ? 'Asset return confirmed'
          : 'Asset handover confirmed',
      text:
        'Hello ' + requester + ',\n\n' +
        'The asset ' + asset + detailReference + ' in borrow request #' + requestId + ' ' +
        action + ' by ' + actor + '.\n\n' +
        (returned
          ? 'Return time: ' + formatDate(params.occurredAt, true) + '\n' +
            'Return condition: ' +
            (asText(params, 'returnCondition') ?? 'Not specified')
          : 'Handover time: ' + formatDate(params.occurredAt, true) + '\n' +
            'Expected return date: ' + formatDate(params.expectedReturnDate)),
    };
  }

  return null;
}

function richIssueTemplate(
  code: DomainEventType | string,
  params: TemplateParams,
): RenderedText | null {
  const issueCodes = [
    'asset_issue.reported',
    'asset_issue.created_from_damaged_return',
    'asset_issue.confirmed',
    'asset_issue.rejected',
    'asset_issue.repair_started',
    'asset_issue.repair_completed',
    'asset_issue.repair_failed',
  ];
  if (!issueCodes.includes(code)) return null;
  const reporter = name(params, 'reporterName', 'there');
  const actor = name(params, 'actorName', 'the BigIn Asset team');
  const asset = assetLabel(params);
  const issueId = asText(params, 'issueId') ?? 'unknown';
  const description = asText(params, 'issueDescription');
  const result = asText(params, 'issueResult');
  const note = asText(params, 'issueNote');
  const status = asText(params, 'issueStatus');
  const detail = [
    description ? 'Description: ' + description : '',
    status ? 'Status: ' + status : '',
    result ? 'Result: ' + result : '',
    note ? 'Note: ' + note : '',
  ].filter(Boolean).join('\n');
  const prefix = 'Asset issue #' + issueId + ' for ' + asset + ' was ';
  const action =
    code === 'asset_issue.reported'
      ? 'reported'
      : code === 'asset_issue.created_from_damaged_return'
        ? 'created from a damaged return'
        : code === 'asset_issue.confirmed'
          ? 'confirmed'
          : code === 'asset_issue.rejected'
            ? 'rejected'
            : code === 'asset_issue.repair_started'
              ? 'moved into repair'
              : code === 'asset_issue.repair_completed'
                ? 'completed successfully'
                : 'marked as failed';
  const title =
    code === 'asset_issue.reported'
      ? 'New asset issue reported'
      : code === 'asset_issue.created_from_damaged_return'
        ? 'Asset issue created from damaged return'
        : code === 'asset_issue.confirmed'
          ? 'Asset issue confirmed'
          : code === 'asset_issue.rejected'
            ? 'Asset issue rejected'
            : code === 'asset_issue.repair_started'
              ? 'Asset repair started'
              : code === 'asset_issue.repair_completed'
                ? 'Asset repair completed'
                : 'Asset repair failed';
  return {
    title,
    text:
      'Hello ' + reporter + ',\n\n' +
      prefix + action + ' by ' + actor + '.\n\n' +
      'Event time: ' + formatDate(params.occurredAt, true) +
      (detail ? '\n' + detail : ''),
  };
}

function isRichParams(params: TemplateParams): boolean {
  return [
    'requesterName',
    'actorName',
    'assetCode',
    'assetModelName',
    'expectedReturnDate',
    'items',
    'approvalItems',
    'issueDescription',
    'issueStatus',
    'issueResult',
    'issueNote',
  ].some((key) => params[key] !== undefined);
}

function validateVersion(code: DomainEventType | string, version: number) {
  if (version !== 1)
    throw new UnsupportedTemplateError(
      'UNSUPPORTED_TEMPLATE:' + code + ':' + version,
    );
}

export class NotificationTemplateCatalog {
  constructor(private readonly logoUrl: string | null = null) {}

  renderText(
    code: DomainEventType | string,
    version: number,
    params: TemplateParams,
  ): RenderedText {
    validateVersion(code, version);
    const rich = isRichParams(params)
      ? richBorrowTemplate(code, params) ?? richIssueTemplate(code, params)
      : null;
    const title = rich?.title ?? String(params.title ?? '');
    const text = rich?.text ?? String(params.message ?? '');
    if (!title || !text)
      throw new UnsupportedTemplateError('INVALID_TEMPLATE_PARAMS:' + code);
    return { title, text };
  }

  render(
    code: DomainEventType | string,
    version: number,
    params: TemplateParams,
    deepLink: string | null,
  ): RenderedTemplate {
    const rendered = this.renderText(code, version, params);
    const validDeepLink =
      deepLink && /^https?:\/\//i.test(deepLink) ? deepLink : null;
    const text = isRichParams(params) && validDeepLink
      ? rendered.text +
        '\n\nYou can review the request and complete the next action in BigIn Asset.\n' +
        validDeepLink
      : rendered.text;
    const safeLogoUrl =
      this.logoUrl && /^https?:\/\//i.test(this.logoUrl)
        ? escapeHtml(this.logoUrl)
        : null;
    const brand = safeLogoUrl
      ? '<img src="' +
        safeLogoUrl +
        '" alt="BigIn Asset" width="144" style="display:block;max-width:144px;height:auto;border:0" />'
      : '<span style="font-size:20px;font-weight:700;color:#0186FE">BigIn Asset</span>';
    const link = validDeepLink
      ? '<p style="margin:28px 0 0"><a href="' +
        escapeHtml(validDeepLink) +
        '" style="display:inline-block;background:#FE6101;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 20px;font-weight:700">View in BigIn Asset</a></p>'
      : '';
    return {
      title: rendered.title,
      text,
      html:
        '<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033">' +
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px"><tr><td align="center">' +
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">' +
        '<tr><td style="padding:24px 28px;border-bottom:1px solid #e7edf5">' +
        brand +
        '</td></tr><tr><td style="padding:32px 28px">' +
        '<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#172033">' +
        escapeHtml(rendered.title) +
        '</h1><p style="margin:0;font-size:16px;line-height:1.6;color:#46546a">' +
        escapeHtml(rendered.text).replace(/\n/g, '<br>') +
        '</p>' +
        link +
        '</td></tr><tr><td style="padding:20px 28px;background:#f8fafc;color:#718096;font-size:12px;line-height:1.5">This is an automated message from BigIn Asset.</td></tr>' +
        '</table></td></tr></table></body></html>',
    };
  }
}

export function deterministicSmtpMessageId(eventId: string, userId: number) {
  return '<' + eventId + '.' + userId + '@bigin.local>';
}
