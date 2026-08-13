-- Contract phase: run only after all application instances use vendor_id.
-- Re-check the legacy mapping before the destructive column drop so a failed
-- or partially rolled-out deployment cannot silently lose provider names.
CREATE TEMPORARY TABLE `_vendor_contract_guard` (`id` TINYINT NOT NULL PRIMARY KEY);
INSERT INTO `_vendor_contract_guard` (`id`) VALUES (1);
INSERT INTO `_vendor_contract_guard` (`id`)
SELECT 1
FROM `asset_issues`
WHERE `repair_provider` IS NOT NULL
  AND TRIM(`repair_provider`) <> ''
  AND `vendor_id` IS NULL
LIMIT 1;
DROP TEMPORARY TABLE `_vendor_contract_guard`;

ALTER TABLE `asset_issues`
    DROP COLUMN `repair_provider`;
