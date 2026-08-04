-- AlterTable
ALTER TABLE `assets` ADD COLUMN `serial_number` VARCHAR(100) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `serial_number` ON `assets`(`serial_number`);
