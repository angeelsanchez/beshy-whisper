import { describe, it, expect } from 'vitest';
import { getPromptsForFranja } from '../writing-prompts';

describe('getPromptsForFranja', () => {
  it('returns 3 prompts by default', () => {
    const prompts = getPromptsForFranja('DIA');
    expect(prompts).toHaveLength(3);
  });

  it('returns the requested count', () => {
    const prompts = getPromptsForFranja('DIA', new Date(), 5);
    expect(prompts).toHaveLength(5);
  });

  it('returns DIA prompts for franja DIA', () => {
    const prompts = getPromptsForFranja('DIA');
    for (const p of prompts) {
      expect(p.franja).toBe('DIA');
    }
  });

  it('returns NOCHE prompts for franja NOCHE', () => {
    const prompts = getPromptsForFranja('NOCHE');
    for (const p of prompts) {
      expect(p.franja).toBe('NOCHE');
    }
  });

  it('returns same prompts for the same date', () => {
    const date = new Date(2026, 0, 15);
    const a = getPromptsForFranja('DIA', date);
    const b = getPromptsForFranja('DIA', date);
    expect(a).toEqual(b);
  });

  it('returns different prompts for different dates', () => {
    const day1 = new Date(2026, 0, 1);
    const day2 = new Date(2026, 0, 2);
    const a = getPromptsForFranja('DIA', day1);
    const b = getPromptsForFranja('DIA', day2);
    expect(a).not.toEqual(b);
  });

  it('every prompt has non-empty text', () => {
    const dia = getPromptsForFranja('DIA', new Date(), 12);
    const noche = getPromptsForFranja('NOCHE', new Date(), 12);
    for (const p of [...dia, ...noche]) {
      expect(p.text.length).toBeGreaterThan(0);
    }
  });

  it('wraps around when count exceeds available prompts', () => {
    const prompts = getPromptsForFranja('DIA', new Date(), 20);
    expect(prompts).toHaveLength(20);
  });
});
