-- Replace the legacy F06 permission namespace without keeping runtime aliases.
-- When the target code does not exist, rename the existing row and preserve its id.
-- When both codes exist, merge role assignments before deleting the legacy row.
START TRANSACTION;

INSERT INTO `permissions` (`name`, `code`)
SELECT 'Report asset issue', 'asset_issue.report'
WHERE NOT EXISTS (
    SELECT 1 FROM `permissions` WHERE `code` = 'asset_issue.report'
);

UPDATE `permissions` AS legacy
LEFT JOIN `permissions` AS target ON target.`code` = 'asset_issue.view'
SET legacy.`code` = 'asset_issue.view', legacy.`name` = 'View asset issues'
WHERE legacy.`code` = 'repair_log.view'
  AND target.`id` IS NULL;

INSERT INTO `permissions` (`name`, `code`)
SELECT 'View asset issues', 'asset_issue.view'
WHERE NOT EXISTS (
    SELECT 1 FROM `permissions` WHERE `code` = 'asset_issue.view'
);

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT legacy_role.`role_id`, target_permission.`id`
FROM `role_permissions` AS legacy_role
INNER JOIN `permissions` AS legacy_permission
    ON legacy_permission.`id` = legacy_role.`permission_id`
INNER JOIN `permissions` AS target_permission
    ON target_permission.`code` = 'asset_issue.view'
WHERE legacy_permission.`code` = 'repair_log.view';

DELETE legacy_role
FROM `role_permissions` AS legacy_role
INNER JOIN `permissions` AS legacy_permission
    ON legacy_permission.`id` = legacy_role.`permission_id`
WHERE legacy_permission.`code` = 'repair_log.view';

DELETE FROM `permissions` WHERE `code` = 'repair_log.view';

UPDATE `permissions` AS legacy
LEFT JOIN `permissions` AS target ON target.`code` = 'asset_issue.create'
SET legacy.`code` = 'asset_issue.create', legacy.`name` = 'Start asset repair'
WHERE legacy.`code` = 'repair_log.create'
  AND target.`id` IS NULL;

INSERT INTO `permissions` (`name`, `code`)
SELECT 'Start asset repair', 'asset_issue.create'
WHERE NOT EXISTS (
    SELECT 1 FROM `permissions` WHERE `code` = 'asset_issue.create'
);

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT legacy_role.`role_id`, target_permission.`id`
FROM `role_permissions` AS legacy_role
INNER JOIN `permissions` AS legacy_permission
    ON legacy_permission.`id` = legacy_role.`permission_id`
INNER JOIN `permissions` AS target_permission
    ON target_permission.`code` = 'asset_issue.create'
WHERE legacy_permission.`code` = 'repair_log.create';

DELETE legacy_role
FROM `role_permissions` AS legacy_role
INNER JOIN `permissions` AS legacy_permission
    ON legacy_permission.`id` = legacy_role.`permission_id`
WHERE legacy_permission.`code` = 'repair_log.create';

DELETE FROM `permissions` WHERE `code` = 'repair_log.create';

UPDATE `permissions` AS legacy
LEFT JOIN `permissions` AS target ON target.`code` = 'asset_issue.update'
SET legacy.`code` = 'asset_issue.update', legacy.`name` = 'Update asset issue'
WHERE legacy.`code` = 'repair_log.update'
  AND target.`id` IS NULL;

INSERT INTO `permissions` (`name`, `code`)
SELECT 'Update asset issue', 'asset_issue.update'
WHERE NOT EXISTS (
    SELECT 1 FROM `permissions` WHERE `code` = 'asset_issue.update'
);

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT legacy_role.`role_id`, target_permission.`id`
FROM `role_permissions` AS legacy_role
INNER JOIN `permissions` AS legacy_permission
    ON legacy_permission.`id` = legacy_role.`permission_id`
INNER JOIN `permissions` AS target_permission
    ON target_permission.`code` = 'asset_issue.update'
WHERE legacy_permission.`code` = 'repair_log.update';

DELETE legacy_role
FROM `role_permissions` AS legacy_role
INNER JOIN `permissions` AS legacy_permission
    ON legacy_permission.`id` = legacy_role.`permission_id`
WHERE legacy_permission.`code` = 'repair_log.update';

DELETE FROM `permissions` WHERE `code` = 'repair_log.update';

UPDATE `permissions` AS legacy
LEFT JOIN `permissions` AS target ON target.`code` = 'asset_issue.close'
SET legacy.`code` = 'asset_issue.close', legacy.`name` = 'Close asset issue'
WHERE legacy.`code` = 'repair_log.close'
  AND target.`id` IS NULL;

INSERT INTO `permissions` (`name`, `code`)
SELECT 'Close asset issue', 'asset_issue.close'
WHERE NOT EXISTS (
    SELECT 1 FROM `permissions` WHERE `code` = 'asset_issue.close'
);

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT legacy_role.`role_id`, target_permission.`id`
FROM `role_permissions` AS legacy_role
INNER JOIN `permissions` AS legacy_permission
    ON legacy_permission.`id` = legacy_role.`permission_id`
INNER JOIN `permissions` AS target_permission
    ON target_permission.`code` = 'asset_issue.close'
WHERE legacy_permission.`code` = 'repair_log.close';

DELETE legacy_role
FROM `role_permissions` AS legacy_role
INNER JOIN `permissions` AS legacy_permission
    ON legacy_permission.`id` = legacy_role.`permission_id`
WHERE legacy_permission.`code` = 'repair_log.close';

DELETE FROM `permissions` WHERE `code` = 'repair_log.close';

COMMIT;
