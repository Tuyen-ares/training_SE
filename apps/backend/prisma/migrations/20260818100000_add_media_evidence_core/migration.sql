-- Media rows are additive. Legacy image_url/avatar_url remain readable and are
-- intentionally not backfilled into media_files or typed evidence tables.

CREATE TABLE `media_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storage_path` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `purpose` ENUM('HANDOVER', 'RETURN', 'AFTER_REPAIR', 'ASSET_IMAGE', 'USER_AVATAR') NOT NULL,
    `upload_status` ENUM('PENDING', 'READY') NOT NULL DEFAULT 'PENDING',
    `uploaded_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `uploaded_at` DATETIME(0) NULL,
    `linked_at` DATETIME(0) NULL,

    UNIQUE INDEX `uq_media_files_storage_path`(`storage_path`),
    INDEX `fk_media_files_uploaded_by`(`uploaded_by`),
    INDEX `idx_media_files_cleanup_status_created`(`upload_status`, `created_at`),
    INDEX `idx_media_files_linked_at`(`linked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `assets` ADD COLUMN `image_media_id` INTEGER NULL;
ALTER TABLE `users` ADD COLUMN `avatar_media_id` INTEGER NULL;

CREATE UNIQUE INDEX `uq_assets_image_media_id` ON `assets`(`image_media_id`);
CREATE UNIQUE INDEX `uq_users_avatar_media_id` ON `users`(`avatar_media_id`);

CREATE TABLE `handover_evidence` (
    `media_file_id` INTEGER NOT NULL,
    `borrow_history_id` INTEGER NOT NULL,

    INDEX `fk_handover_evidence_history`(`borrow_history_id`),
    PRIMARY KEY (`media_file_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `return_evidence` (
    `media_file_id` INTEGER NOT NULL,
    `borrow_history_id` INTEGER NOT NULL,

    INDEX `fk_return_evidence_history`(`borrow_history_id`),
    PRIMARY KEY (`media_file_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `repair_evidence` (
    `media_file_id` INTEGER NOT NULL,
    `asset_issue_id` INTEGER NOT NULL,

    INDEX `fk_repair_evidence_issue`(`asset_issue_id`),
    PRIMARY KEY (`media_file_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `media_files`
    ADD CONSTRAINT `fk_media_files_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE `assets`
    ADD CONSTRAINT `fk_assets_image_media` FOREIGN KEY (`image_media_id`) REFERENCES `media_files`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `users`
    ADD CONSTRAINT `fk_users_avatar_media` FOREIGN KEY (`avatar_media_id`) REFERENCES `media_files`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `handover_evidence`
    ADD CONSTRAINT `fk_handover_evidence_media` FOREIGN KEY (`media_file_id`) REFERENCES `media_files`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT `fk_handover_evidence_history` FOREIGN KEY (`borrow_history_id`) REFERENCES `borrow_histories`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE `return_evidence`
    ADD CONSTRAINT `fk_return_evidence_media` FOREIGN KEY (`media_file_id`) REFERENCES `media_files`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT `fk_return_evidence_history` FOREIGN KEY (`borrow_history_id`) REFERENCES `borrow_histories`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE `repair_evidence`
    ADD CONSTRAINT `fk_repair_evidence_media` FOREIGN KEY (`media_file_id`) REFERENCES `media_files`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT `fk_repair_evidence_issue` FOREIGN KEY (`asset_issue_id`) REFERENCES `asset_issues`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
