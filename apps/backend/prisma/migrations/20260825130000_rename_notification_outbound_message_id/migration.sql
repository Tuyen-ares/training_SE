ALTER TABLE `notification_deliveries`
  CHANGE COLUMN `smtp_message_id` `outbound_message_id` VARCHAR(255) NULL;
