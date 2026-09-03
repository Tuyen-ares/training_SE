CREATE TABLE `notification_devices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `provider` VARCHAR(20) NOT NULL DEFAULT 'FCM',
  `token_hash` CHAR(64) NOT NULL,
  `token` TEXT NOT NULL,
  `platform` VARCHAR(20) NOT NULL DEFAULT 'WEB',
  `user_agent` VARCHAR(500) NULL,
  `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `failure_count` INTEGER NOT NULL DEFAULT 0,
  `last_error` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `uq_notification_devices_token_hash`(`token_hash`),
  INDEX `idx_notification_devices_user_active`(`user_id`, `is_active`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notification_devices_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
