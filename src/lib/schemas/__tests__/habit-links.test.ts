import { describe, it, expect } from 'vitest';
import { requestHabitLinkSchema, respondHabitLinkSchema } from '../habit-links';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';

describe('requestHabitLinkSchema', () => {
  it('validates a valid request', () => {
    const result = requestHabitLinkSchema.safeParse({
      responderId: VALID_UUID,
      requesterHabitId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('validates a request with optional message', () => {
    const result = requestHabitLinkSchema.safeParse({
      responderId: VALID_UUID,
      requesterHabitId: VALID_UUID_2,
      message: '¿Hacemos gym juntos?',
    });
    expect(result.success).toBe(true);
  });

  it('trims the message', () => {
    const result = requestHabitLinkSchema.safeParse({
      responderId: VALID_UUID,
      requesterHabitId: VALID_UUID_2,
      message: '  hola  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('hola');
    }
  });

  it('rejects message longer than 200 chars', () => {
    const result = requestHabitLinkSchema.safeParse({
      responderId: VALID_UUID,
      requesterHabitId: VALID_UUID_2,
      message: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid responderId UUID', () => {
    const result = requestHabitLinkSchema.safeParse({
      responderId: 'not-a-uuid',
      requesterHabitId: VALID_UUID_2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid requesterHabitId UUID', () => {
    const result = requestHabitLinkSchema.safeParse({
      responderId: VALID_UUID,
      requesterHabitId: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing responderId', () => {
    const result = requestHabitLinkSchema.safeParse({
      requesterHabitId: VALID_UUID_2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing requesterHabitId', () => {
    const result = requestHabitLinkSchema.safeParse({
      responderId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });
});

describe('respondHabitLinkSchema', () => {
  it('validates accept with responderHabitId', () => {
    const result = respondHabitLinkSchema.safeParse({
      linkId: VALID_UUID,
      action: 'accept',
      responderHabitId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('validates decline without responderHabitId', () => {
    const result = respondHabitLinkSchema.safeParse({
      linkId: VALID_UUID,
      action: 'decline',
    });
    expect(result.success).toBe(true);
  });

  it('accepts accept without responderHabitId (route auto-creates it)', () => {
    const result = respondHabitLinkSchema.safeParse({
      linkId: VALID_UUID,
      action: 'accept',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid action', () => {
    const result = respondHabitLinkSchema.safeParse({
      linkId: VALID_UUID,
      action: 'ignore',
      responderHabitId: VALID_UUID_2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid linkId UUID', () => {
    const result = respondHabitLinkSchema.safeParse({
      linkId: 'not-valid',
      action: 'decline',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing linkId', () => {
    const result = respondHabitLinkSchema.safeParse({
      action: 'decline',
    });
    expect(result.success).toBe(false);
  });

  it('ignores extra fields like responderHabitId', () => {
    const result = respondHabitLinkSchema.safeParse({
      linkId: VALID_UUID,
      action: 'accept',
      responderHabitId: 'bad-uuid',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('responderHabitId' in result.data).toBe(false);
    }
  });

  it('allows decline with responderHabitId provided', () => {
    const result = respondHabitLinkSchema.safeParse({
      linkId: VALID_UUID,
      action: 'decline',
      responderHabitId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });
});
