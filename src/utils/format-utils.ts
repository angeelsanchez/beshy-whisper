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
    // Format as XXX,XXmil
    const thousands = count / 1000;
    // Format with 2 decimal places, then remove trailing zeros
    const formatted = thousands.toFixed(2).replace(/\.?0+$/, '');
    return formatted.replace('.', ',') + 'mil';
  } else {
    // Format as XXX,XM for millions
    const millions = count / 1000000;
    // Format with 1 decimal place, then remove trailing zeros
    const formatted = millions.toFixed(1).replace(/\.?0+$/, '');
    return formatted.replace('.', ',') + 'M';
  }
} 