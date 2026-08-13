-- QR identifiers are generated once when an asset is created. The former
-- regeneration capability is not part of the MVP and has no runtime route.
-- Remove the retired permission and any role assignments that may remain in
-- databases created before that capability was removed.
START TRANSACTION;

DELETE role_permission
FROM `role_permissions` AS role_permission
INNER JOIN `permissions` AS permission
  ON permission.`id` = role_permission.`permission_id`
WHERE permission.`code` = 'asset.qr_generate';

DELETE FROM `permissions`
WHERE `code` = 'asset.qr_generate';

COMMIT;
