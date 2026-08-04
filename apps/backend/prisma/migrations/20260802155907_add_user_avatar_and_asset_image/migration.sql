-- DropForeignKey
ALTER TABLE `asset_issues` DROP FOREIGN KEY `fk_asset_issues_handled_by`;

-- DropForeignKey
ALTER TABLE `asset_issues` DROP FOREIGN KEY `fk_asset_issues_reported_by`;

-- DropForeignKey
ALTER TABLE `borrow_histories` DROP FOREIGN KEY `fk_borrow_histories_handed_over_by`;

-- DropForeignKey
ALTER TABLE `borrow_histories` DROP FOREIGN KEY `fk_borrow_histories_received_by`;

-- DropForeignKey
ALTER TABLE `borrow_request_details` DROP FOREIGN KEY `fk_borrow_details_approved_by`;

-- AlterTable
ALTER TABLE `assets` ADD COLUMN `image_url` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `avatar_url` VARCHAR(500) NULL;

-- AddForeignKey
ALTER TABLE `borrow_histories` ADD CONSTRAINT `fk_borrow_histories_handed_over_by` FOREIGN KEY (`handed_over_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `borrow_histories` ADD CONSTRAINT `fk_borrow_histories_received_by` FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `asset_issues` ADD CONSTRAINT `fk_asset_issues_reported_by` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `asset_issues` ADD CONSTRAINT `fk_asset_issues_handled_by` FOREIGN KEY (`handled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `borrow_request_details` ADD CONSTRAINT `fk_borrow_details_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
