-- Expand phase: add independent lifecycle capabilities before removing the
-- legacy delete/status permissions. No role name is used for the backfill;
-- existing grants are copied from the permissions that guarded the old flow.

-- MySQL does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS on all
-- supported versions. Use information_schema plus a prepared statement so
-- re-running the migration remains safe on both MySQL and MariaDB.
SET @add_department_status_column = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `departments` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true',
    'SELECT 1'
  )
  FROM `information_schema`.`columns`
  WHERE `table_schema` = DATABASE()
    AND `table_name` = 'departments'
    AND `column_name` = 'is_active'
);
PREPARE add_department_status_column FROM @add_department_status_column;
EXECUTE add_department_status_column;
DEALLOCATE PREPARE add_department_status_column;

INSERT INTO `permissions` (`name`, `code`, `description`) VALUES
  ('Manage user status', 'user.manage_status', 'Activate or deactivate user accounts without deleting business history.'),
  ('Manage vendor status', 'vendor.manage_status', 'Activate or deactivate vendors without deleting vendor history.'),
  ('Manage department status', 'department.manage_status', 'Activate or deactivate departments while retaining assignments and history.')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`);

-- User status used user.update for activation and user.delete for
-- deactivation. Copy either existing capability to the new flat permission.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT old_grant.`role_id`, target_permission.`id`
FROM `role_permissions` AS old_grant
INNER JOIN `permissions` AS old_permission
  ON old_permission.`id` = old_grant.`permission_id`
INNER JOIN `permissions` AS target_permission
  ON target_permission.`code` = 'user.manage_status'
WHERE old_permission.`code` IN ('user.update', 'user.delete');

-- Vendor status was previously part of vendor.update and may still have a
-- vendor.delete grant on databases that predate its contract migration.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT old_grant.`role_id`, target_permission.`id`
FROM `role_permissions` AS old_grant
INNER JOIN `permissions` AS old_permission
  ON old_permission.`id` = old_grant.`permission_id`
INNER JOIN `permissions` AS target_permission
  ON target_permission.`code` = 'vendor.manage_status'
WHERE old_permission.`code` IN ('vendor.update', 'vendor.delete');

-- Department lifecycle mutation was guarded by department.delete.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT old_grant.`role_id`, target_permission.`id`
FROM `role_permissions` AS old_grant
INNER JOIN `permissions` AS old_permission
  ON old_permission.`id` = old_grant.`permission_id`
INNER JOIN `permissions` AS target_permission
  ON target_permission.`code` = 'department.manage_status'
WHERE old_permission.`code` = 'department.delete';
