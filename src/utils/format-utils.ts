/**
 * Formats a number as a like count with the following rules:
 * - If count ≤ 999: show as XXX (e.g., 123)
 * - If count ≥ 1,000 and ≤ 999,999: show as XXX,XXmil (e.g., 1,23mil)
 * - If count ≥ 1,000,000: show as XXX,XM (e.g., 1,2M)
 */
export function formatLikeCount(count: number): string {
  if (count <= 999) {
    return count.toString();
  } else if (count >= 1000 && count <= 999999) {
    const thousands = count / 1000;
    const formatted = String(Number.parseFloat(thousands.toFixed(2)));
    return formatted.replace('.', ',') + 'mil';
  } else {
    const millions = count / 1000000;
    const formatted = String(Number.parseFloat(millions.toFixed(1)));
    return formatted.replace('.', ',') + 'M';
  }
} 