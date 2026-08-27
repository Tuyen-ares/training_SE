ALTER TABLE notification_deliveries
  ADD COLUMN correlation_id_snapshot VARCHAR(64) NULL AFTER event_id,
  MODIFY COLUMN status ENUM('PENDING', 'PUBLISHING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING';

DROP INDEX idx_delivery_due ON notification_deliveries;
DROP INDEX idx_delivery_lock ON notification_deliveries;
CREATE INDEX idx_delivery_channel_status_due
  ON notification_deliveries (channel, status, next_attempt_at, id);
CREATE INDEX idx_delivery_channel_status_lock
  ON notification_deliveries (channel, status, locked_at, id);

DROP INDEX idx_outbox_due ON outbox_events;
DROP INDEX idx_outbox_lock ON outbox_events;
CREATE INDEX idx_outbox_due
  ON outbox_events (status, next_attempt_at, id);
CREATE INDEX idx_outbox_lock
  ON outbox_events (status, locked_at, id);
