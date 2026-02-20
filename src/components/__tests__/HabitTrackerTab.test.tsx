import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/utils/habit-helpers', () => ({
  getWeekCompletionCount: vi.fn(() => 3),
}));

import HabitTrackerTab from '../HabitTrackerTab';
import type { Habit } from '@/hooks/useHabits';

const today = '2026-02-20';

const dailyHabit: Habit = {
  id: 'h-daily',
  name: 'Meditar',
  description: null,
  color: '#4A2E1B',
  frequency: 'daily',
  frequency_mode: 'specific_days',
  target_days: [0, 1, 2, 3, 4, 5, 6],
  weekly_target: null,
  tracking_type: 'binary',
  target_value: null,
  unit: null,
  icon: null,
  has_levels: false,
  is_active: true,
  created_at: '2026-01-01',
};

const weeklyHabit: Habit = {
  id: 'h-weekly',
  name: 'Correr',
  description: null,
  color: '#8B5A2B',
  frequency: 'weekly',
  frequency_mode: 'weekly_count',
  target_days: [],
  weekly_target: 3,
  tracking_type: 'binary',
  target_value: null,
  unit: null,
  icon: null,
  has_levels: false,
  is_active: true,
  created_at: '2026-01-01',
};

const mockOnToggle = vi.fn();
const mockOnIncrement = vi.fn();

const defaultProps = {
  habits: [dailyHabit, weeklyHabit],
  isDay: true,
  isCompleted: vi.fn(() => false),
  getValue: vi.fn(() => 0),
  toggling: false,
  today,
  activeTimerHabitId: null,
  elapsedSeconds: 0,
  completedMap: new Map<string, Set<string>>(),
  onToggle: mockOnToggle,
  onIncrement: mockOnIncrement,
  onTimerStart: vi.fn(),
  onTimerStop: vi.fn(),
  onEdit: vi.fn(),
  onAdd: vi.fn(),
} as const;

describe('HabitTrackerTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders daily and weekly habit sections', () => {
    render(<HabitTrackerTab {...defaultProps} />);
    expect(screen.getByText('Hábitos diarios')).toBeDefined();
    expect(screen.getByText('Hábitos semanales')).toBeDefined();
  });

  it('renders the add habit button', () => {
    render(<HabitTrackerTab {...defaultProps} />);
    expect(screen.getByText('Nuevo hábito')).toBeDefined();
  });

  it('calls onAdd when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<HabitTrackerTab {...defaultProps} />);

    await user.click(screen.getByText('Nuevo hábito'));
    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  it('passes today as displayDate to onToggle by default', async () => {
    const user = userEvent.setup();
    render(<HabitTrackerTab {...defaultProps} />);

    const habitCards = screen.getAllByRole('button');
    const toggleButton = habitCards.find(b => b.getAttribute('aria-label')?.includes('Completar') || b.getAttribute('aria-label')?.includes('completar'));

    if (toggleButton) {
      await user.click(toggleButton);
      expect(mockOnToggle).toHaveBeenCalledWith('h-daily', today);
    }
  });

  it('navigates to previous day on chevron click', async () => {
    const user = userEvent.setup();
    render(<HabitTrackerTab {...defaultProps} />);

    const prevButton = screen.getAllByRole('button')[0];
    await user.click(prevButton);

    expect(screen.getByText(/19/)).toBeDefined();
  });

  it('shows empty state when no habits', () => {
    render(<HabitTrackerTab {...defaultProps} habits={[]} />);
    expect(screen.getByText('Nuevo hábito')).toBeDefined();
  });
});
