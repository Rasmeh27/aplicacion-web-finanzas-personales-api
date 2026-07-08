/**
 * detect-leaks — QA-only heuristic that scans an assistant reply for content
 * that should NEVER reach the user (internal reasoning, RAG source citations,
 * chunk references, internal ids/scopes/metadata).
 *
 * Pure function, no framework deps, so it is trivial to unit-test once a
 * frontend test runner exists (none is configured today). It NEVER blocks the
 * response — the UI only shows a discreet "QA warning" when it returns flags.
 *
 * All patterns are case-insensitive. It returns the human-readable labels of
 * the patterns that matched (empty array = clean).
 */
const LEAK_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: '<think>', pattern: /<\s*\/?\s*think\s*>/i },
  { label: 'Fuente N', pattern: /\bfuente\s*\d+/i },
  { label: '[Fuente X]', pattern: /\[\s*fuente\b/i },
  { label: 'chunk(s)', pattern: /\bchunks?\b/i },
  { label: 'request_id', pattern: /request_id/i },
  { label: 'user_id', pattern: /user_id/i },
  { label: 'allowed_scopes', pattern: /allowed_scopes/i },
  { label: 'prompt interno', pattern: /prompt\s+interno/i },
  { label: 'raw context', pattern: /raw\s+context/i },
  { label: 'metadata', pattern: /\bmetadata\b/i },
];

export function detectAssistantLeaks(text: string): string[] {
  if (!text) return [];
  return LEAK_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}
