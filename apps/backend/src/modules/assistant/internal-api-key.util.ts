const INTERNAL_API_KEY_PLACEHOLDERS: ReadonlySet<string> = new Set([
  'change-me',
  'your-secret',
  'your-api-key',
]);

/** Returns false for missing, blank, or known example-only credentials. */
export function isInternalApiKeyConfigured(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.length > 0 && !INTERNAL_API_KEY_PLACEHOLDERS.has(normalized);
}
