-- Asset Manager needs department reference data to create and update assets.
-- This is a direct flat-RBAC mapping, not role inheritance.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `roles`.`id`, `permissions`.`id`
FROM `roles`
INNER JOIN `permissions` ON `permissions`.`code` = 'department.view'
WHERE `roles`.`name` = 'asset_manager';
