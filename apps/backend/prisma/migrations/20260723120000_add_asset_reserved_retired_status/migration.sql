ALTER TABLE `assets`
  MODIFY `status` ENUM(
    'available',
    'reserved',
    'borrowed',
    'damaged',
    'in_repair',
    'retired'
  ) NOT NULL DEFAULT 'available';
