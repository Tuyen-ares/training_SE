-- Preserve legacy rows while making the request purpose mandatory for new data.
UPDATE `borrow_requests`
SET `note` = 'Legacy request: purpose not recorded'
WHERE `note` IS NULL OR TRIM(`note`) = '';

ALTER TABLE `borrow_requests`
    MODIFY `note` TEXT NOT NULL;
