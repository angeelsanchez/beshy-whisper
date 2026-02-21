import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

global.fetch = vi.fn();

import HabitLevelRow from '../HabitLevelRow';

const defaultProps = {
  habitId: 'habit-1',
  habitName: 'Meditación',
  isDay: true,
  shouldSuggestAdvance: false,
  currentLevel: 2,
  maxLevel: 5,
  onChanged: vi.fn(),
} as const;

describe('HabitLevelRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  });

  it('renders habit name and level', () => {
    render(<HabitLevelRow {...defaultProps} />);
    expect(screen.getByText('Meditación')).toBeDefined();
    expect(screen.getByText('Nivel 2/5')).toBeDefined();
  });

  it('renders up and down arrows when not at max or min', () => {
    render(<HabitLevelRow {...defaultProps} />);
    expect(screen.getByTitle('Subir de nivel')).toBeDefined();
    expect(screen.getByTitle('Bajar de nivel')).toBeDefined();
  });

  it('hides up arrow and shows max badge at max level', () => {
    render(<HabitLevelRow {...defaultProps} currentLevel={5} maxLevel={5} />);
    expect(screen.queryByTitle('Subir de nivel')).toBeNull();
    expect(screen.getByText('Máx')).toBeDefined();
  });

  it('hides down arrow at level 1', () => {
    render(<HabitLevelRow {...defaultProps} currentLevel={1} />);
    expect(screen.queryByTitle('Bajar de nivel')).toBeNull();
  });

  it('calls advance API on up click', async () => {
    const user = userEvent.setup();
    render(<HabitLevelRow {...defaultProps} />);

    await user.click(screen.getByTitle('Subir de nivel'));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/habits/habit-1/advance-level',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      }),
    );
  });

  it('calls onChanged after successful advance', async () => {
    const user = userEvent.setup();
    render(<HabitLevelRow {...defaultProps} />);

    await user.click(screen.getByTitle('Subir de nivel'));
    await waitFor(() => {
      expect(defaultProps.onChanged).toHaveBeenCalled();
    });
  });

  it('requires confirmation for decrease', async () => {
    const user = userEvent.setup();
    render(<HabitLevelRow {...defaultProps} />);

    await user.click(screen.getByTitle('Bajar de nivel'));
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('decrease-level'),
      expect.anything(),
    );

    await user.click(screen.getByTitle('Pulsa de nuevo para confirmar'));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/habits/habit-1/decrease-level',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('applies suggested advance styling when shouldSuggestAdvance is true', () => {
    render(<HabitLevelRow {...defaultProps} shouldSuggestAdvance />);
    const upBtn = screen.getByTitle('Subir de nivel');
    expect(upBtn.className).toContain('green');
  });
});
