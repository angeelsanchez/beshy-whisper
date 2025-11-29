import { describe, it, expect } from 'vitest';
import { getQuoteOfTheDay } from '../quotes';

describe('getQuoteOfTheDay', () => {
  it('returns an object with text and author', () => {
    const quote = getQuoteOfTheDay();
    expect(typeof quote.text).toBe('string');
    expect(typeof quote.author).toBe('string');
    expect(quote.text.length).toBeGreaterThan(0);
    expect(quote.author.length).toBeGreaterThan(0);
  });

  it('returns the same quote for the same date', () => {
    const date = new Date(2026, 5, 15);
    const a = getQuoteOfTheDay(date);
    const b = getQuoteOfTheDay(date);
    expect(a).toEqual(b);
  });

  it('returns different quotes for different dates', () => {
    const day1 = new Date(2026, 0, 1);
    const day2 = new Date(2026, 0, 2);
    const a = getQuoteOfTheDay(day1);
    const b = getQuoteOfTheDay(day2);
    expect(a.text).not.toBe(b.text);
  });

  it('handles year boundary correctly', () => {
    const dec31 = new Date(2025, 11, 31);
    const jan1 = new Date(2026, 0, 1);
    const a = getQuoteOfTheDay(dec31);
    const b = getQuoteOfTheDay(jan1);
    expect(a.text).not.toBe(b.text);
  });

  it('never returns empty text or author', () => {
    for (let day = 0; day < 365; day++) {
      const date = new Date(2026, 0, 1);
      date.setDate(date.getDate() + day);
      const quote = getQuoteOfTheDay(date);
      expect(quote.text.length).toBeGreaterThan(0);
      expect(quote.author.length).toBeGreaterThan(0);
    }
  });
});
