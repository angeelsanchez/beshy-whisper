import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../html-escape';

describe('escapeHtml', () => {
  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns safe strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
    expect(escapeHtml('Test 123')).toBe('Test 123');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('escapes quotes', () => {
    expect(escapeHtml('"double" and \'single\'')).toBe(
      '&quot;double&quot; and &#x27;single&#x27;'
    );
  });

  it('escapes backticks', () => {
    expect(escapeHtml('`template`')).toBe('&#96;template&#96;');
  });

  it('escapes forward slashes', () => {
    expect(escapeHtml('path/to/file')).toBe('path&#x2F;to&#x2F;file');
  });

  it('handles combined XSS payloads', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).not.toContain('"');
  });

  it('handles event handler injection', () => {
    const payload = '" onmouseover="alert(document.cookie)"';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('"');
  });
});
