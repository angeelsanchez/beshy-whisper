import { describe, it, expect } from 'vitest';
import {
  MOOD_VALUES,
  MOOD_OPTIONS,
  getMoodEmoji,
  getMoodLabel,
  getMoodColor,
  isMood,
} from '../mood';

describe('MOOD_VALUES', () => {
  it('contains exactly 8 mood values', () => {
    expect(MOOD_VALUES).toHaveLength(8);
  });

  it('contains all expected moods', () => {
    const expected = ['feliz', 'tranquilo', 'agradecido', 'energetico', 'triste', 'ansioso', 'cansado', 'frustrado'];
    expect([...MOOD_VALUES]).toEqual(expected);
  });
});

describe('MOOD_OPTIONS', () => {
  it('has one option per mood value', () => {
    expect(MOOD_OPTIONS).toHaveLength(MOOD_VALUES.length);
    for (const mood of MOOD_VALUES) {
      expect(MOOD_OPTIONS.find(o => o.value === mood)).toBeDefined();
    }
  });

  it('every option has emoji, label and color', () => {
    for (const option of MOOD_OPTIONS) {
      expect(option.emoji.length).toBeGreaterThan(0);
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('getMoodEmoji', () => {
  it('returns correct emoji for each mood', () => {
    expect(getMoodEmoji('feliz')).toBe('😊');
    expect(getMoodEmoji('tranquilo')).toBe('😌');
    expect(getMoodEmoji('agradecido')).toBe('🙏');
    expect(getMoodEmoji('energetico')).toBe('⚡');
    expect(getMoodEmoji('triste')).toBe('😢');
    expect(getMoodEmoji('ansioso')).toBe('😰');
    expect(getMoodEmoji('cansado')).toBe('😴');
    expect(getMoodEmoji('frustrado')).toBe('😤');
  });
});

describe('getMoodLabel', () => {
  it('returns correct label for each mood', () => {
    expect(getMoodLabel('feliz')).toBe('Feliz');
    expect(getMoodLabel('frustrado')).toBe('Frustrado');
  });
});

describe('getMoodColor', () => {
  it('returns a hex color for each mood', () => {
    for (const mood of MOOD_VALUES) {
      expect(getMoodColor(mood)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('isMood', () => {
  it('returns true for valid mood strings', () => {
    for (const mood of MOOD_VALUES) {
      expect(isMood(mood)).toBe(true);
    }
  });

  it('returns false for invalid strings', () => {
    expect(isMood('happy')).toBe(false);
    expect(isMood('')).toBe(false);
    expect(isMood('FELIZ')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isMood(null)).toBe(false);
    expect(isMood(undefined)).toBe(false);
    expect(isMood(42)).toBe(false);
    expect(isMood({})).toBe(false);
  });
});
