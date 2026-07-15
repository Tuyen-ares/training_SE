-- CreateTable
CREATE TABLE `assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_model_id` INTEGER NOT NULL,
    `status` ENUM('available', 'borrowed', 'damaged', 'in_repair') NOT NULL DEFAULT 'available',
    `qr_code` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `qr_code`(`qr_code`),
    INDEX `fk_assets_model`(`asset_model_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `department_id` INTEGER NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `password` VARCHAR(60) NOT NULL,
    `email` VARCHAR(40) NOT NULL,
    `phone` VARCHAR(10) NOT NULL,

    UNIQUE INDEX `email`(`email`),
    UNIQUE INDEX `phone`(`phone`),
    INDEX `fk_users_department`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrow_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrow_request_detail_id` INTEGER NOT NULL,
    `borrow_date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `return_date` DATETIME(0) NULL,

    UNIQUE INDEX `borrow_request_detail_id`(`borrow_request_detail_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `handled_by` INTEGER NOT NULL,
    `start_date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `end_date` DATETIME(0) NULL,
    `cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `note` TEXT NULL,

    INDEX `fk_repair_logs_asset`(`asset_id`),
    INDEX `fk_repair_logs_handler`(`handled_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_models` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `brand_id` INTEGER NOT NULL,
    `asset_type_id` INTEGER NOT NULL,
    `name` VARCHAR(30) NOT NULL,

    INDEX `fk_asset_models_type`(`asset_type_id`),
    UNIQUE INDEX `uq_asset_models`(`brand_id`, `asset_type_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrow_request_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrow_request_id` INTEGER NOT NULL,
    `asset_id` INTEGER NOT NULL,
    `expected_return_date` DATETIME(0) NOT NULL,

    INDEX `fk_borrow_details_asset`(`asset_id`),
    UNIQUE INDEX `uq_borrow_request_asset`(`borrow_request_id`, `asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrow_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(0) NULL,
    `note` TEXT NULL,

    INDEX `fk_borrow_requests_approver`(`approved_by`),
    INDEX `fk_borrow_requests_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,
    `code` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `code`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    INDEX `fk_role_permissions_permission`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,

    INDEX `fk_user_roles_role`(`role_id`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `fk_assets_model` FOREIGN KEY (`asset_model_id`) REFERENCES `asset_models`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `borrow_histories` ADD CONSTRAINT `fk_borrow_histories_detail` FOREIGN KEY (`borrow_request_detail_id`) REFERENCES `borrow_request_details`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `repair_logs` ADD CONSTRAINT `fk_repair_logs_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT;

-- AddForeignKey
ALTER TABLE `repair_logs` ADD CONSTRAINT `fk_repair_logs_handler` FOREIGN KEY (`handled_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT;

-- AddForeignKey
ALTER TABLE `asset_models` ADD CONSTRAINT `fk_asset_models_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `asset_models` ADD CONSTRAINT `fk_asset_models_type` FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `borrow_request_details` ADD CONSTRAINT `fk_borrow_details_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `borrow_request_details` ADD CONSTRAINT `fk_borrow_details_request` FOREIGN KEY (`borrow_request_id`) REFERENCES `borrow_requests`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `borrow_requests` ADD CONSTRAINT `fk_borrow_requests_approver` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `borrow_requests` ADD CONSTRAINT `fk_borrow_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
