CREATE TABLE notification_messages (
  id BIGINT NOT NULL AUTO_INCREMENT,
  event_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  template_version INT NOT NULL DEFAULT 1,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_messages_event_id (event_id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE notification_deliveries
  ADD COLUMN message_id BIGINT NULL,
  ADD INDEX fk_delivery_message (message_id),
  ADD CONSTRAINT fk_delivery_message
    FOREIGN KEY (message_id) REFERENCES notification_messages (id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;