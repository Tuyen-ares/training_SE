-- `normalized_prefix` is derived from the display name; it is deliberately not
-- client input. MariaDB has no Unicode-NFD function, so this backfill maps the
-- Vietnamese composed characters used by the product data and strips remaining
-- non A-Z/0-9 characters. New writes use the application Unicode-NFD helper.
ALTER TABLE `asset_types`
    ADD COLUMN `normalized_prefix` VARCHAR(30) NULL AFTER `name`;

CREATE TEMPORARY TABLE `_asset_type_prefix_backfill` (
    `id` INTEGER NOT NULL,
    `prefix` VARCHAR(30) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `_asset_type_prefix_backfill_prefix` (`prefix`)
);

INSERT INTO `_asset_type_prefix_backfill` (`id`, `prefix`)
SELECT
    `id`,
    UPPER(REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`name`, 'Đ', 'D'), 'đ', 'D'), 'À', 'A'), 'Á', 'A'), 'Ạ', 'A'), 'Ả', 'A'), 'Ã', 'A'), 'Ă', 'A'), 'Ằ', 'A'), 'Ắ', 'A'), 'Ặ', 'A'), 'Ẳ', 'A'), 'Ẵ', 'A'), 'Â', 'A'), 'Ầ', 'A'), 'Ấ', 'A'), 'Ậ', 'A'), 'Ẩ', 'A'), 'Ẫ', 'A'), 'à', 'A'), 'á', 'A'), 'ạ', 'A'), 'ả', 'A'), 'ã', 'A'), 'ă', 'A'), 'ằ', 'A'), 'ắ', 'A'), 'ặ', 'A'), 'ẳ', 'A'), 'ẵ', 'A'), 'â', 'A'), 'ầ', 'A'), 'ấ', 'A'), 'ậ', 'A'), 'ẩ', 'A'), 'ẫ', 'A'), 'È', 'E'), 'É', 'E'), 'Ẹ', 'E'), 'Ẻ', 'E'), 'Ẽ', 'E'), 'Ê', 'E'), 'Ề', 'E'), 'Ế', 'E'), 'Ệ', 'E'), 'Ể', 'E'), 'Ễ', 'E'), 'è', 'E'), 'é', 'E'), 'ẹ', 'E'), 'ẻ', 'E'), 'ẽ', 'E'), 'ê', 'E'), 'ề', 'E'), 'ế', 'E'), 'ệ', 'E'), 'ể', 'E'), 'ễ', 'E'), 'Ì', 'I'), 'Í', 'I'), 'Ị', 'I'), 'Ỉ', 'I'), 'Ĩ', 'I'), 'ì', 'I'), 'í', 'I'), 'ị', 'I'), 'ỉ', 'I'), 'ĩ', 'I'), 'Ò', 'O'), 'Ó', 'O'), 'Ọ', 'O'), 'Ỏ', 'O'), 'Õ', 'O'), 'Ô', 'O'), 'Ồ', 'O'), 'Ố', 'O'), 'Ộ', 'O'), 'Ổ', 'O'), 'Ỗ', 'O'), 'Ơ', 'O'), 'Ờ', 'O'), 'Ớ', 'O'), 'Ợ', 'O'), 'Ở', 'O'), 'Ỡ', 'O'), 'ò', 'O'), 'ó', 'O'), 'ọ', 'O'), 'ỏ', 'O'), 'õ', 'O'), 'ô', 'O'), 'ồ', 'O'), 'ố', 'O'), 'ộ', 'O'), 'ổ', 'O'), 'ỗ', 'O'), 'ơ', 'O'), 'ờ', 'O'), 'ớ', 'O'), 'ợ', 'O'), 'ở', 'O'), 'ỡ', 'O'), 'Ù', 'U'), 'Ú', 'U'), 'Ụ', 'U'), 'Ủ', 'U'), 'Ũ', 'U'), 'Ư', 'U'), 'Ừ', 'U'), 'Ứ', 'U'), 'Ự', 'U'), 'Ử', 'U'), 'Ữ', 'U'), 'ù', 'U'), 'ú', 'U'), 'ụ', 'U'), 'ủ', 'U'), 'ũ', 'U'), 'ư', 'U'), 'ừ', 'U'), 'ứ', 'U'), 'ự', 'U'), 'ử', 'U'), 'ữ', 'U'), 'Ỳ', 'Y'), 'Ý', 'Y'), 'Ỵ', 'Y'), 'Ỷ', 'Y'), 'Ỹ', 'Y'), 'ỳ', 'Y'), 'ý', 'Y'), 'ỵ', 'Y'), 'ỷ', 'Y'), 'ỹ', 'Y'), '[^A-Z0-9]', '')) AS `prefix`
FROM `asset_types`;

-- These duplicate-key guards intentionally abort the migration before any
-- persistent backfill if a type has no usable prefix or two types normalize to
-- the same prefix. Resolve the source type names and rerun; no suffixing occurs.
CREATE TEMPORARY TABLE `_asset_prefix_preflight` (
    `guard` TINYINT NOT NULL PRIMARY KEY
);
INSERT INTO `_asset_prefix_preflight` (`guard`) VALUES (1);
INSERT INTO `_asset_prefix_preflight` (`guard`)
SELECT 1 FROM `_asset_type_prefix_backfill` WHERE `prefix` = '' LIMIT 1;
INSERT INTO `_asset_prefix_preflight` (`guard`)
SELECT 1 FROM `_asset_type_prefix_backfill` GROUP BY `prefix` HAVING COUNT(*) > 1 LIMIT 1;

UPDATE `asset_types` AS `asset_type`
INNER JOIN `_asset_type_prefix_backfill` AS `backfill` ON `backfill`.`id` = `asset_type`.`id`
SET `asset_type`.`normalized_prefix` = `backfill`.`prefix`;

ALTER TABLE `asset_types`
    MODIFY `normalized_prefix` VARCHAR(30) NOT NULL;
CREATE UNIQUE INDEX `normalized_prefix` ON `asset_types`(`normalized_prefix`);

CREATE TABLE `asset_code_sequences` (
    `prefix` VARCHAR(30) NOT NULL,
    `last_sequence` INTEGER NOT NULL,
    PRIMARY KEY (`prefix`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `assets`
    ADD COLUMN `asset_code` VARCHAR(64) NULL AFTER `id`;

CREATE TEMPORARY TABLE `_asset_code_backfill` (
    `id` INTEGER NOT NULL,
    `prefix` VARCHAR(30) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `asset_code` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `_asset_code_backfill_asset_code` (`asset_code`)
);

INSERT INTO `_asset_code_backfill` (`id`, `prefix`, `sequence`, `asset_code`)
SELECT
    `asset`.`id`,
    `asset_type`.`normalized_prefix`,
    ROW_NUMBER() OVER (
      PARTITION BY `asset_type`.`normalized_prefix`
      ORDER BY `asset`.`id` ASC
    ) AS `sequence`,
    CONCAT(
      `asset_type`.`normalized_prefix`,
      LPAD(ROW_NUMBER() OVER (
        PARTITION BY `asset_type`.`normalized_prefix`
        ORDER BY `asset`.`id` ASC
      ), 4, '0')
    ) AS `asset_code`
FROM `assets` AS `asset`
INNER JOIN `asset_models` AS `asset_model` ON `asset_model`.`id` = `asset`.`asset_model_id`
INNER JOIN `asset_types` AS `asset_type` ON `asset_type`.`id` = `asset_model`.`asset_type_id`;

UPDATE `assets` AS `asset`
INNER JOIN `_asset_code_backfill` AS `backfill` ON `backfill`.`id` = `asset`.`id`
SET `asset`.`asset_code` = `backfill`.`asset_code`;

INSERT INTO `asset_code_sequences` (`prefix`, `last_sequence`)
SELECT `prefix`, MAX(`sequence`)
FROM `_asset_code_backfill`
GROUP BY `prefix`;

-- Every asset has a model/type FK, so a missing backfill row is a migration
-- failure rather than a candidate for a generated fallback code.
INSERT INTO `_asset_prefix_preflight` (`guard`)
SELECT 1 FROM `assets` WHERE `asset_code` IS NULL LIMIT 1;

ALTER TABLE `assets`
    MODIFY `asset_code` VARCHAR(64) NOT NULL;
CREATE UNIQUE INDEX `asset_code` ON `assets`(`asset_code`);

DROP TEMPORARY TABLE `_asset_code_backfill`;
DROP TEMPORARY TABLE `_asset_prefix_preflight`;
DROP TEMPORARY TABLE `_asset_type_prefix_backfill`;
