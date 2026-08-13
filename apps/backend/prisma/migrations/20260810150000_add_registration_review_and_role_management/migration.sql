-- Registration requests keep credentials outside users until an authorized review.
CREATE TABLE `registration_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,
    `email` VARCHAR(40) NOT NULL,
    `phone` VARCHAR(10) NOT NULL,
    `password_hash` VARCHAR(60) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `pending_email_key` VARCHAR(40) NULL,
    `pending_phone_key` VARCHAR(10) NULL,
    `reviewed_by` INTEGER NULL,
    `reviewed_at` DATETIME(0) NULL,
    `rejection_reason` TEXT NULL,
    `created_user_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_registration_pending_email`(`pending_email_key`),
    UNIQUE INDEX `uq_registration_pending_phone`(`pending_phone_key`),
    UNIQUE INDEX `uq_registration_created_user`(`created_user_id`),
    INDEX `idx_registration_status_created`(`status`, `created_at`),
    INDEX `idx_registration_reviewer`(`reviewed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `registration_requests`
  ADD CONSTRAINT `fk_registration_reviewer`
  FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE `registration_requests`
  ADD CONSTRAINT `fk_registration_created_user`
  FOREIGN KEY (`created_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE `permissions` ADD COLUMN `description` VARCHAR(255) NULL;
ALTER TABLE `roles` ADD COLUMN `is_system` BOOLEAN NOT NULL DEFAULT false;

UPDATE `roles`
SET `is_system` = true
WHERE `name` IN ('admin', 'employee', 'asset_manager');

INSERT IGNORE INTO `permissions` (`name`, `code`, `description`) VALUES
  ('View users', 'user.view', 'View user accounts and their assigned departments and roles.'),
  ('Create users', 'user.create', 'Create active user accounts.'),
  ('Update users', 'user.update', 'Update user account information and reactivate accounts.'),
  ('Deactivate users', 'user.delete', 'Deactivate user accounts without deleting business history.'),
  ('View roles', 'role.view', 'View roles and the permissions assigned to each role.'),
  ('Create roles', 'role.create', 'Create a custom role with an initial permission set.'),
  ('Update roles', 'role.update', 'Rename custom roles and replace a role permission set.'),
  ('Assign roles', 'role.assign', 'Assign or unassign existing roles for a user.'),
  ('View permissions', 'permission.view', 'View permission codes and descriptions when configuring roles.'),
  ('Review registrations', 'user_registration.review', 'View, approve, or reject public registration requests.');

UPDATE `permissions` SET `description` = CASE `code`
  WHEN 'dashboard.view' THEN 'View the operational dashboard.'
  WHEN 'department.view' THEN 'View departments used by users and assets.'
  WHEN 'department.create' THEN 'Create departments.'
  WHEN 'department.update' THEN 'Update department names.'
  WHEN 'department.delete' THEN 'Delete an eligible department.'
  WHEN 'brand.view' THEN 'View asset brands.'
  WHEN 'brand.create' THEN 'Create asset brands.'
  WHEN 'brand.update' THEN 'Update asset brands.'
  WHEN 'brand.delete' THEN 'Delete an eligible asset brand.'
  WHEN 'asset_type.view' THEN 'View asset types.'
  WHEN 'asset_type.create' THEN 'Create asset types.'
  WHEN 'asset_type.update' THEN 'Update asset types.'
  WHEN 'asset_type.delete' THEN 'Delete an eligible asset type.'
  WHEN 'asset_model.view' THEN 'View asset models.'
  WHEN 'asset_model.create' THEN 'Create asset models.'
  WHEN 'asset_model.update' THEN 'Update asset models.'
  WHEN 'asset_model.delete' THEN 'Delete an eligible asset model.'
  WHEN 'asset.view' THEN 'View assets and asset details.'
  WHEN 'asset.create' THEN 'Create assets.'
  WHEN 'asset.update' THEN 'Update assets.'
  WHEN 'asset.delete' THEN 'Retire eligible assets.'
  WHEN 'asset.qr_generate' THEN 'Generate or regenerate an asset QR identifier.'
  WHEN 'asset.checkout' THEN 'Confirm handover of reserved assets.'
  WHEN 'asset.checkin' THEN 'Confirm return of borrowed assets.'
  WHEN 'asset_issue.report' THEN 'Report an asset issue.'
  WHEN 'asset_issue.view' THEN 'View asset issues and repair details.'
  WHEN 'asset_issue.create' THEN 'Review reported issues and start repairs.'
  WHEN 'asset_issue.update' THEN 'Update repair progress and details.'
  WHEN 'asset_issue.close' THEN 'Complete or fail an in-progress repair.'
  WHEN 'borrow_request.create' THEN 'Create a borrow request.'
  WHEN 'borrow_request.view_own' THEN 'View borrow requests created by the current user.'
  WHEN 'borrow_request.view_all' THEN 'View borrow requests across the company.'
  WHEN 'borrow_request.update_own' THEN 'Update an eligible own borrow request.'
  WHEN 'borrow_request.cancel_own' THEN 'Cancel an eligible own borrow request.'
  WHEN 'borrow_request.approve' THEN 'Approve pending borrow request details.'
  WHEN 'borrow_request.reject' THEN 'Reject pending borrow request details.'
  WHEN 'borrow_history.view_own' THEN 'View the current user borrow history.'
  WHEN 'borrow_history.view_all' THEN 'View borrow history across users.'
  WHEN 'user.view' THEN 'View user accounts and their assigned departments and roles.'
  WHEN 'user.create' THEN 'Create active user accounts.'
  WHEN 'user.update' THEN 'Update user account information and reactivate accounts.'
  WHEN 'user.delete' THEN 'Deactivate user accounts without deleting business history.'
  WHEN 'role.view' THEN 'View roles and the permissions assigned to each role.'
  WHEN 'role.create' THEN 'Create a custom role with an initial permission set.'
  WHEN 'role.update' THEN 'Rename custom roles and replace a role permission set.'
  WHEN 'role.assign' THEN 'Assign or unassign existing roles for a user.'
  WHEN 'permission.view' THEN 'View permission codes and descriptions when configuring roles.'
  WHEN 'permission.create' THEN 'Create permission records through controlled system maintenance.'
  WHEN 'permission.update' THEN 'Update permission records through controlled system maintenance.'
  WHEN 'permission.delete' THEN 'Delete permission records through controlled system maintenance.'
  WHEN 'user_registration.review' THEN 'View, approve, or reject public registration requests.'
  ELSE CONCAT('Operational permission: ', `code`, '.')
END;

ALTER TABLE `permissions` MODIFY COLUMN `description` VARCHAR(255) NOT NULL;

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code IN (
  'user.view', 'user.create', 'user.update', 'user.delete',
  'role.view', 'role.create', 'role.update', 'role.assign',
  'permission.view', 'user_registration.review'
)
WHERE r.name = 'admin';

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code = 'user_registration.review'
WHERE r.name = 'asset_manager';
