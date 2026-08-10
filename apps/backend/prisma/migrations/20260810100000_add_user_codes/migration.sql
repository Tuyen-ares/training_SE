ALTER TABLE `users`
    ADD COLUMN `user_code` VARCHAR(20) NULL AFTER `id`;

CREATE TEMPORARY TABLE `_user_code_backfill` (
    `id` INTEGER NOT NULL,
    `sequence` BIGINT NOT NULL,
    PRIMARY KEY (`id`)
);

INSERT INTO `_user_code_backfill` (`id`, `sequence`)
SELECT
    `id`,
    ROW_NUMBER() OVER (ORDER BY `id` ASC)
FROM `users`;

UPDATE `users` AS `user`
INNER JOIN `_user_code_backfill` AS `backfill` ON `backfill`.`id` = `user`.`id`
SET `user`.`user_code` = CONCAT('BI26', LPAD(`backfill`.`sequence`, 3, '0'));

DROP TEMPORARY TABLE `_user_code_backfill`;

CREATE TABLE `user_code_sequences` (
    `year` INTEGER NOT NULL,
    `last_sequence` INTEGER NOT NULL,
    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `user_code_sequences` (`year`, `last_sequence`)
SELECT 2026, COUNT(*) FROM `users`;

ALTER TABLE `users`
    MODIFY `user_code` VARCHAR(20) NOT NULL;

CREATE UNIQUE INDEX `user_code` ON `users`(`user_code`);
