import { describe, it, expect } from 'vitest';
import { isValidUUID } from '../user-helpers';

describe('isValidUUID', () => {
  it('accepts valid v4 UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('accepts UUIDs with uppercase letters', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('rejects random strings', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('12345')).toBe(false);
    expect(isValidUUID('hello-world-test-data-nope')).toBe(false);
  });

  it('rejects UUIDs with wrong format', () => {
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
  });

  it('rejects UUIDs with invalid version byte', () => {
    expect(isValidUUID('550e8400-e29b-61d4-a716-446655440000')).toBe(false);
  });

  it('rejects UUIDs with invalid variant byte', () => {
    expect(isValidUUID('550e8400-e29b-41d4-c716-446655440000')).toBe(false);
  });
});
