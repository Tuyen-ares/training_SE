-- Contract phase: after code using *.manage_status is deployed, remove the
-- obsolete lifecycle/delete capabilities and their role assignments.
-- DELETE ... JOIN is safe when a prior compatibility migration already
-- removed one of these permission rows (for example vendor.delete).

DELETE role_permission
FROM `role_permissions` AS role_permission
INNER JOIN `permissions` AS permission
  ON permission.`id` = role_permission.`permission_id`
WHERE permission.`code` IN (
  'user.delete',
  'vendor.delete',
  'department.delete',
  'role.delete'
);

DELETE FROM `permissions`
WHERE `code` IN (
  'user.delete',
  'vendor.delete',
  'department.delete',
  'role.delete'
);
