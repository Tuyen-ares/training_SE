-- Expand phase: introduce the shared vendor master and preserve the legacy
-- repair_provider column until the application contract has been deployed.
CREATE TABLE `vendors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `contact_name` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `asset_issues`
    ADD COLUMN `vendor_id` INTEGER NULL AFTER `handled_by`,
    ADD INDEX `fk_asset_issues_vendor`(`vendor_id`);

-- TRIM is deliberately applied before grouping. MariaDB's table collation
-- then handles case/diacritic equivalence consistently with vendors.name.
INSERT INTO `vendors` (`name`, `is_active`)
SELECT MIN(TRIM(`repair_provider`)), true
FROM `asset_issues`
WHERE `repair_provider` IS NOT NULL
  AND TRIM(`repair_provider`) <> ''
GROUP BY TRIM(`repair_provider`);

UPDATE `asset_issues` AS issue
JOIN `vendors` AS vendor
  ON vendor.`name` = TRIM(issue.`repair_provider`)
SET issue.`vendor_id` = vendor.`id`
WHERE issue.`repair_provider` IS NOT NULL
  AND TRIM(issue.`repair_provider`) <> '';

-- Abort before adding the FK when any meaningful legacy value could not be
-- mapped. The explicit primary key is required by sql_require_primary_key.
CREATE TEMPORARY TABLE `_vendor_backfill_guard` (`id` TINYINT NOT NULL PRIMARY KEY);
INSERT INTO `_vendor_backfill_guard` (`id`) VALUES (1);
INSERT INTO `_vendor_backfill_guard` (`id`)
SELECT 1
FROM `asset_issues`
WHERE `repair_provider` IS NOT NULL
  AND TRIM(`repair_provider`) <> ''
  AND `vendor_id` IS NULL
LIMIT 1;
DROP TEMPORARY TABLE `_vendor_backfill_guard`;

ALTER TABLE `asset_issues`
    ADD CONSTRAINT `fk_asset_issues_vendor`
    FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

INSERT IGNORE INTO `permissions` (`name`, `code`, `description`) VALUES
  ('View vendors', 'vendor.view', 'View vendor catalog, contacts, and repair provider names.'),
  ('Create vendors', 'vendor.create', 'Create vendor master records.'),
  ('Update vendors', 'vendor.update', 'Update vendor details and active status.'),
  ('Delete vendors', 'vendor.delete', 'Delete an unused vendor master record.');

-- One-time compatibility grant: derive vendor.view from the role-permission
-- rows that actually guard the current repair-provider mutation endpoints.
-- This is not runtime inheritance and does not grant anything to future roles.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT role_permission.`role_id`, vendor_view.`id`
FROM `role_permissions` AS role_permission
INNER JOIN `permissions` AS repair_permission
  ON repair_permission.`id` = role_permission.`permission_id`
INNER JOIN `permissions` AS vendor_view
  ON vendor_view.`code` = 'vendor.view'
WHERE repair_permission.`code` IN ('asset_issue.create', 'asset_issue.update', 'asset_issue.close');

-- Initial configuration for the existing system roles. Runtime authorization
-- never infers vendor permissions from a role name.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` AS r
INNER JOIN `permissions` AS p
  ON p.`code` IN ('vendor.view', 'vendor.create', 'vendor.update', 'vendor.delete')
WHERE r.`name` IN ('admin', 'asset_manager');
