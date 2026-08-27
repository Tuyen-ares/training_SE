ALTER TABLE `outbox_events`
  DROP COLUMN `delivery_count`;

ALTER TABLE `notification_deliveries`
  DROP COLUMN `template_code`,
  DROP COLUMN `template_version`;
