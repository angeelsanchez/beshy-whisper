import { describe, it, expect } from 'vitest';
import { safeCompare } from '../crypto-helpers';

describe('safeCompare', () => {
  it('returns true for identical strings', () => {
    expect(safeCompare('secret123', 'secret123')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(safeCompare('secret123', 'secret456')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(safeCompare('short', 'much-longer-string')).toBe(false);
  });

  it('returns false for empty first argument', () => {
    expect(safeCompare('', 'secret')).toBe(false);
  });

  it('returns false for empty second argument', () => {
    expect(safeCompare('secret', '')).toBe(false);
  });

  it('returns false for both empty', () => {
    expect(safeCompare('', '')).toBe(false);
  });

  it('handles Bearer token format', () => {
    const token = 'Bearer my-secret-key';
    expect(safeCompare(token, 'Bearer my-secret-key')).toBe(true);
    expect(safeCompare(token, 'Bearer wrong-key')).toBe(false);
  });

  it('handles unicode strings', () => {
    expect(safeCompare('contraseña', 'contraseña')).toBe(true);
    expect(safeCompare('contraseña', 'contrasena')).toBe(false);
  });
});
