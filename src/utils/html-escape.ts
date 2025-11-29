const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const ESCAPE_REGEX = /[&<>"'/`]/g;

export function escapeHtml(input: string): string {
  return input.replace(ESCAPE_REGEX, (char) => ESCAPE_MAP[char] || char);
}
