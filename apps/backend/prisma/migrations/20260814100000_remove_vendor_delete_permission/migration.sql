-- Vendor records are retained for history. Deactivation through PATCH is the
-- only supported lifecycle operation; remove the obsolete delete permission.
DELETE role_permissions
FROM role_permissions
INNER JOIN permissions
  ON permissions.id = role_permissions.permission_id
WHERE permissions.code = 'vendor.delete';

DELETE FROM permissions
WHERE code = 'vendor.delete';
