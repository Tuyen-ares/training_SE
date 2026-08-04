-- Release 1: permit assigned users to report asset issues company-wide.
INSERT INTO `permissions` (`name`, `code`)
VALUES ('Report asset issue', 'asset_issue.report')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Role mappings are data defaults, not a runtime role hierarchy.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `roles`.`id`, `permissions`.`id`
FROM `roles`
INNER JOIN `permissions` ON `permissions`.`code` = 'asset_issue.report'
WHERE `roles`.`name` IN ('admin', 'asset_manager');
