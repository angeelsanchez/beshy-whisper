import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const mockExportHabitsToExcel = vi.fn().mockResolvedValue(undefined);
vi.mock('@/utils/export-excel', () => ({
  exportHabitsToExcel: (...args: unknown[]) => mockExportHabitsToExcel(...args),
}));

const mockChartData = {
  success: true,
  global: [
    { label: 'L', percentage: 80, date: '2026-02-16' },
    { label: 'M', percentage: 0, date: '2026-02-17' },
    { label: 'X', percentage: 60, date: '2026-02-18' },
    { label: 'J', percentage: 0, date: '2026-02-19' },
    { label: 'V', percentage: 100, date: '2026-02-20' },
  ],
  habits: [],
  availableHabits: [{ id: 'h1', name: 'Meditar' }],
};

global.fetch = vi.fn();

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => <div data-testid="bar-chart" data-bars={data.length}>{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
}));

import HabitChartsSimple from '../HabitChartsSimple';

describe('HabitChartsSimple', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockChartData),
    });
  });

  it('renders loading state initially', () => {
    render(<HabitChartsSimple isDay={true} />);
    expect(screen.getByText('Cargando gráficas...')).toBeDefined();
  });

  it('renders chart after data loads', async () => {
    render(<HabitChartsSimple isDay={true} />);
    await waitFor(() => {
      expect(screen.getByText('Cumplimiento global')).toBeDefined();
    });
  });

  it('renders view toggle buttons', async () => {
    render(<HabitChartsSimple isDay={true} />);
    await waitFor(() => {
      expect(screen.getByText('Semana')).toBeDefined();
      expect(screen.getByText('Mes')).toBeDefined();
      expect(screen.getByText('Año')).toBeDefined();
    });
  });

  it('filters empty bars when hide-empty is toggled', async () => {
    const user = userEvent.setup();
    render(<HabitChartsSimple isDay={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeDefined();
    });

    const barChart = screen.getByTestId('bar-chart');
    expect(barChart.getAttribute('data-bars')).toBe('5');

    const hideEmptyBtn = screen.getByTitle('Ocultar períodos vacíos');
    await user.click(hideEmptyBtn);

    await waitFor(() => {
      const updatedChart = screen.getByTestId('bar-chart');
      expect(updatedChart.getAttribute('data-bars')).toBe('3');
    });
  });

  it('calls exportHabitsToExcel on export click', async () => {
    const user = userEvent.setup();

    render(<HabitChartsSimple isDay={true} />);
    await waitFor(() => {
      expect(screen.getByTitle('Exportar a Excel')).toBeDefined();
    });

    await user.click(screen.getByTitle('Exportar a Excel'));

    await waitFor(() => {
      expect(mockExportHabitsToExcel).toHaveBeenCalledWith({
        globalData: mockChartData.global,
        habitsData: [],
        viewLabel: 'Semana',
      });
    });
  });

  it('switches view when clicking Mes button', async () => {
    const user = userEvent.setup();
    render(<HabitChartsSimple isDay={true} />);

    await waitFor(() => {
      expect(screen.getByText('Mes')).toBeDefined();
    });

    await user.click(screen.getByText('Mes'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('view=month'),
    );
  });
});
