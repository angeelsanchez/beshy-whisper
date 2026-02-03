import { describe, it, expect } from 'vitest';
import {
  HABIT_TEMPLATES,
  CATEGORIES,
  ICON_OPTIONS,
  getTemplatesByCategory,
} from '../habit-templates';
import type { HabitCategory } from '../habit-templates';

describe('HABIT_TEMPLATES', () => {
  it('has at least 10 templates', () => {
    expect(HABIT_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it('every template has required fields', () => {
    for (const t of HABIT_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.category.length).toBeGreaterThan(0);
      expect(t.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(['binary', 'quantity']).toContain(t.trackingType);
      expect(t.suggestedDays.length).toBeGreaterThan(0);
    }
  });

  it('quantity templates have targetValue and unit', () => {
    const quantityTemplates = HABIT_TEMPLATES.filter(t => t.trackingType === 'quantity');
    expect(quantityTemplates.length).toBeGreaterThan(0);
    for (const t of quantityTemplates) {
      expect(t.targetValue).toBeDefined();
      expect(t.targetValue).toBeGreaterThan(0);
      expect(t.unit).toBeDefined();
      expect(t.unit!.length).toBeGreaterThan(0);
    }
  });

  it('binary templates do not require targetValue or unit', () => {
    const binaryTemplates = HABIT_TEMPLATES.filter(t => t.trackingType === 'binary');
    expect(binaryTemplates.length).toBeGreaterThan(0);
  });

  it('all suggestedDays are valid (0-6)', () => {
    for (const t of HABIT_TEMPLATES) {
      for (const day of t.suggestedDays) {
        expect(day).toBeGreaterThanOrEqual(0);
        expect(day).toBeLessThanOrEqual(6);
      }
    }
  });

  it('all categories in templates are valid', () => {
    const validCategories = Object.keys(CATEGORIES);
    for (const t of HABIT_TEMPLATES) {
      expect(validCategories).toContain(t.category);
    }
  });

  it('has no duplicate template names', () => {
    const names = HABIT_TEMPLATES.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('CATEGORIES', () => {
  it('has all 6 categories', () => {
    expect(Object.keys(CATEGORIES)).toHaveLength(6);
  });

  it('every category has label and icon', () => {
    for (const cat of Object.values(CATEGORIES)) {
      expect(cat.label.length).toBeGreaterThan(0);
      expect(cat.icon.length).toBeGreaterThan(0);
    }
  });
});

describe('ICON_OPTIONS', () => {
  it('has at least 20 icons', () => {
    expect(ICON_OPTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('has no duplicates', () => {
    expect(new Set(ICON_OPTIONS).size).toBe(ICON_OPTIONS.length);
  });
});

describe('getTemplatesByCategory', () => {
  it('returns templates for health', () => {
    const templates = getTemplatesByCategory('health');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.category).toBe('health');
    }
  });

  it('returns templates for every category', () => {
    const categories: HabitCategory[] = ['health', 'mind', 'productivity', 'wellness', 'social', 'creativity'];
    for (const cat of categories) {
      const templates = getTemplatesByCategory(cat);
      expect(templates.length).toBeGreaterThan(0);
    }
  });

  it('returns empty array for nonexistent category', () => {
    const templates = getTemplatesByCategory('nonexistent' as HabitCategory);
    expect(templates).toEqual([]);
  });
});
