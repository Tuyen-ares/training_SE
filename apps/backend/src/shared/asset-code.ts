const MAX_PREFIX_LENGTH = 30;

/**
 * Produces the stable, database-safe prefix used by an asset type. This is
 * intentionally separate from the user-facing type name.
 */
export function normalizeAssetTypePrefix(name: string): string {
  const normalized = name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Đđ]/g, (character) => (character === 'Đ' ? 'D' : 'd'))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!normalized) {
    throw new InvalidAssetTypePrefixError(
      'Asset type name must contain at least one letter or number for its code prefix',
    );
  }
  if (normalized.length > MAX_PREFIX_LENGTH) {
    throw new InvalidAssetTypePrefixError(
      `Asset type code prefix must be at most ${MAX_PREFIX_LENGTH} characters`,
    );
  }

  return normalized;
}

export function isValidAssetTypePrefixSource(name: string): boolean {
  try {
    normalizeAssetTypePrefix(name);
    return true;
  } catch {
    return false;
  }
}

export function formatAssetCode(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

export class InvalidAssetTypePrefixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAssetTypePrefixError';
  }
}
