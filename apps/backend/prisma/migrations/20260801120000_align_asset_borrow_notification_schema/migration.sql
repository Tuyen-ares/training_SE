-- This migration intentionally preserves unknown legacy business data as NULL.
-- Application services must enforce rules for records created after this migration.

-- Abort before permanent DDL if an old asset uses a status with no approved mapping.
CREATE TEMPORARY TABLE `_migration_guard_assets_status` (`id` TINYINT NOT NULL PRIMARY KEY);
INSERT INTO `_migration_guard_assets_status` (`id`) VALUES (1);
INSERT INTO `_migration_guard_assets_status` (`id`)
SELECT 1
FROM `assets`
WHERE `status` NOT IN ('available', 'reserved', 'borrowed', 'damaged', 'in_repair', 'retired')
LIMIT 1;
DROP TEMPORARY TABLE `_migration_guard_assets_status`;

-- MariaDB ENUM values are case-insensitive. Keep the legacy ordinal order so
-- changing labels to upper-case preserves each existing value without a data update.
ALTER TABLE `assets`
    MODIFY `status` ENUM('AVAILABLE', 'RESERVED', 'BORROWED', 'DAMAGED', 'IN_REPAIR', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
    ADD COLUMN `department_id` INTEGER NULL,
    ADD INDEX `fk_assets_department`(`department_id`),
    ADD CONSTRAINT `fk_assets_department` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve repair history while expanding it into issue management.
RENAME TABLE `repair_logs` TO `asset_issues`;

ALTER TABLE `asset_issues`
    DROP FOREIGN KEY `fk_repair_logs_asset`,
    DROP FOREIGN KEY `fk_repair_logs_handler`,
    DROP INDEX `fk_repair_logs_asset`,
    DROP INDEX `fk_repair_logs_handler`,
    MODIFY `handled_by` INTEGER NULL,
    MODIFY `start_date` DATETIME(0) NULL,
    MODIFY `end_date` DATETIME(0) NULL,
    MODIFY `cost` DECIMAL(12, 2) NULL,
    ADD COLUMN `reported_by` INTEGER NULL AFTER `asset_id`,
    ADD COLUMN `description` TEXT NULL AFTER `reported_by`,
    ADD COLUMN `status` VARCHAR(30) NULL AFTER `description`,
    ADD COLUMN `repair_provider` VARCHAR(255) NULL AFTER `handled_by`,
    ADD COLUMN `result` TEXT NULL AFTER `cost`,
    ADD COLUMN `created_at` DATETIME(0) NULL,
    ADD COLUMN `updated_at` DATETIME(0) NULL;

-- Defaults apply only to records created after the migration; legacy values remain NULL.
ALTER TABLE `asset_issues`
    MODIFY `status` VARCHAR(30) NULL DEFAULT 'REPORTED',
    MODIFY `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    MODIFY `updated_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
    ADD INDEX `fk_asset_issues_asset`(`asset_id`),
    ADD INDEX `fk_asset_issues_reported_by`(`reported_by`),
    ADD INDEX `fk_asset_issues_handled_by`(`handled_by`),
    ADD CONSTRAINT `fk_asset_issues_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT `fk_asset_issues_reported_by` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT `fk_asset_issues_handled_by` FOREIGN KEY (`handled_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Abort before permanent DDL if a request status cannot be migrated safely.
CREATE TEMPORARY TABLE `_migration_guard_borrow_request_status` (`id` TINYINT NOT NULL PRIMARY KEY);
INSERT INTO `_migration_guard_borrow_request_status` (`id`) VALUES (1);
INSERT INTO `_migration_guard_borrow_request_status` (`id`)
SELECT 1
FROM `borrow_requests`
WHERE `status` NOT IN ('pending', 'approved', 'rejected')
LIMIT 1;
DROP TEMPORARY TABLE `_migration_guard_borrow_request_status`;

-- Add per-item review fields before copying values from the request header.
ALTER TABLE `borrow_request_details`
    ADD COLUMN `approval_status` VARCHAR(30) NOT NULL DEFAULT 'PENDING' AFTER `asset_id`,
    ADD COLUMN `approved_by` INTEGER NULL AFTER `approval_status`,
    ADD COLUMN `approved_at` DATETIME(0) NULL AFTER `approved_by`,
    ADD COLUMN `rejection_reason` TEXT NULL AFTER `approved_at`,
    ADD COLUMN `note` TEXT NULL AFTER `rejection_reason`,
    ADD INDEX `fk_borrow_details_approved_by`(`approved_by`),
    ADD CONSTRAINT `fk_borrow_details_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Do not invent a rejection reason or an approver/time when legacy data omitted it.
UPDATE `borrow_request_details` AS `detail`
INNER JOIN `borrow_requests` AS `request` ON `request`.`id` = `detail`.`borrow_request_id`
SET
    `detail`.`approval_status` = CASE `request`.`status`
        WHEN 'approved' THEN 'APPROVED'
        WHEN 'rejected' THEN 'REJECTED'
        ELSE 'PENDING'
    END,
    `detail`.`approved_by` = CASE
        WHEN `request`.`status` IN ('approved', 'rejected') THEN `request`.`approved_by`
        ELSE NULL
    END,
    `detail`.`approved_at` = CASE
        WHEN `request`.`status` IN ('approved', 'rejected') THEN `request`.`approved_at`
        ELSE NULL
    END,
    `detail`.`rejection_reason` = NULL;

-- The first three labels retain the legacy enum ordinal order, preserving data
-- while normalizing case. New request states are appended afterwards.
ALTER TABLE `borrow_requests`
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_APPROVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    DROP FOREIGN KEY `fk_borrow_requests_approver`,
    DROP INDEX `fk_borrow_requests_approver`,
    DROP COLUMN `approved_by`,
    DROP COLUMN `approved_at`;

-- New handover/return fields remain nullable for legacy history with unknown actors.
ALTER TABLE `borrow_histories`
    ADD COLUMN `handed_over_by` INTEGER NULL AFTER `borrow_request_detail_id`,
    ADD COLUMN `received_by` INTEGER NULL AFTER `borrow_date`,
    ADD COLUMN `return_condition` VARCHAR(100) NULL AFTER `return_date`,
    ADD INDEX `fk_borrow_histories_handed_over_by`(`handed_over_by`),
    ADD INDEX `fk_borrow_histories_received_by`(`received_by`),
    ADD CONSTRAINT `fk_borrow_histories_handed_over_by` FOREIGN KEY (`handed_over_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT `fk_borrow_histories_received_by` FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Rename a manually-created legacy Notification table when present. Abort if both names exist.
SET @legacy_notification_table = (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Notification'
);
SET @notifications_table = (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'notifications'
);
CREATE TEMPORARY TABLE `_migration_guard_notification_table` (`id` TINYINT NOT NULL PRIMARY KEY);
INSERT INTO `_migration_guard_notification_table` (`id`) VALUES (1);
INSERT INTO `_migration_guard_notification_table` (`id`)
SELECT 1 WHERE @legacy_notification_table > 0 AND @notifications_table > 0;
DROP TEMPORARY TABLE `_migration_guard_notification_table`;
SET @rename_notification_table_sql = IF(
    @legacy_notification_table > 0,
    'RENAME TABLE `Notification` TO `notifications`',
    'SELECT 1'
);
PREPARE rename_notification_table_statement FROM @rename_notification_table_sql;
EXECUTE rename_notification_table_statement;
DEALLOCATE PREPARE rename_notification_table_statement;

CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipient_user_id` INTEGER NOT NULL,
    `notification_type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `related_entity_type` VARCHAR(50) NULL,
    `related_entity_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    INDEX `idx_notifications_recipient_is_read`(`recipient_user_id`, `is_read`),
    INDEX `idx_notifications_recipient_created_at`(`recipient_user_id`, `created_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_notifications_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Rename the legacy primary-key column only when the legacy table was present.
SET @legacy_notification_id_column = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'notifications' AND BINARY COLUMN_NAME = 'notification_id'
);
SET @notification_id_column = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'notifications' AND BINARY COLUMN_NAME = 'id'
);
CREATE TEMPORARY TABLE `_migration_guard_notification_id` (`id` TINYINT NOT NULL PRIMARY KEY);
INSERT INTO `_migration_guard_notification_id` (`id`) VALUES (1);
INSERT INTO `_migration_guard_notification_id` (`id`)
SELECT 1 WHERE @legacy_notification_id_column > 0 AND @notification_id_column > 0;
DROP TEMPORARY TABLE `_migration_guard_notification_id`;
SET @rename_notification_id_sql = IF(
    @legacy_notification_id_column > 0,
    'ALTER TABLE `notifications` CHANGE COLUMN `notification_id` `id` INTEGER NOT NULL AUTO_INCREMENT',
    'SELECT 1'
);
PREPARE rename_notification_id_statement FROM @rename_notification_id_sql;
EXECUTE rename_notification_id_statement;
DEALLOCATE PREPARE rename_notification_id_statement;

-- A legacy Notification table used BIGINT in the draft ERD. Do not narrow an
-- out-of-range value silently when normalizing it to the system-wide INT ID type.
CREATE TEMPORARY TABLE `_migration_guard_notification_reference_id` (`id` TINYINT NOT NULL PRIMARY KEY);
INSERT INTO `_migration_guard_notification_reference_id` (`id`) VALUES (1);
INSERT INTO `_migration_guard_notification_reference_id` (`id`)
SELECT 1
FROM `notifications`
WHERE `related_entity_id` < -2147483648 OR `related_entity_id` > 2147483647
LIMIT 1;
DROP TEMPORARY TABLE `_migration_guard_notification_reference_id`;

ALTER TABLE `notifications`
    MODIFY `related_entity_type` VARCHAR(50) NULL,
    MODIFY `related_entity_id` INTEGER NULL,
    MODIFY `is_read` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `read_at` DATETIME(0) NULL,
    MODIFY `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- Existing legacy tables need the same indexes and FK as a newly-created table.
SET @has_notification_unread_index = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND BINARY TABLE_NAME = 'notifications'
      AND BINARY INDEX_NAME = 'idx_notifications_recipient_is_read'
);
SET @create_notification_unread_index_sql = IF(
    @has_notification_unread_index = 0,
    'CREATE INDEX `idx_notifications_recipient_is_read` ON `notifications` (`recipient_user_id`, `is_read`)',
    'SELECT 1'
);
PREPARE create_notification_unread_index_statement FROM @create_notification_unread_index_sql;
EXECUTE create_notification_unread_index_statement;
DEALLOCATE PREPARE create_notification_unread_index_statement;

SET @has_notification_created_index = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND BINARY TABLE_NAME = 'notifications'
      AND BINARY INDEX_NAME = 'idx_notifications_recipient_created_at'
);
SET @create_notification_created_index_sql = IF(
    @has_notification_created_index = 0,
    'CREATE INDEX `idx_notifications_recipient_created_at` ON `notifications` (`recipient_user_id`, `created_at`)',
    'SELECT 1'
);
PREPARE create_notification_created_index_statement FROM @create_notification_created_index_sql;
EXECUTE create_notification_created_index_statement;
DEALLOCATE PREPARE create_notification_created_index_statement;

SET @has_notification_recipient_fk = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND BINARY TABLE_NAME = 'notifications'
      AND BINARY CONSTRAINT_NAME = 'fk_notifications_recipient'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @create_notification_recipient_fk_sql = IF(
    @has_notification_recipient_fk = 0,
    'ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
    'SELECT 1'
);
PREPARE create_notification_recipient_fk_statement FROM @create_notification_recipient_fk_sql;
EXECUTE create_notification_recipient_fk_statement;
DEALLOCATE PREPARE create_notification_recipient_fk_statement;
