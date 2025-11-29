import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseTheme = vi.fn().mockReturnValue({ isDay: true });
const mockUseNotificationPreferences = vi.fn();

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
}));

vi.mock('@/hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: () => mockUseNotificationPreferences(),
}));

import NotificationPreferencesPanel from '../NotificationPreferencesPanel';

function setupDefaultPreferences(overrides: Record<string, unknown> = {}) {
  mockUseNotificationPreferences.mockReturnValue({
    loading: false,
    saving: false,
    error: null,
    isEnabled: vi.fn().mockReturnValue(true),
    updatePreference: vi.fn(),
    isCategoryFullyEnabled: vi.fn().mockReturnValue(true),
    isCategoryPartiallyEnabled: vi.fn().mockReturnValue(false),
    toggleCategory: vi.fn(),
    preferences: {},
    ...overrides,
  });
}

describe('NotificationPreferencesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue({ isDay: true });
  });

  it('renders loading spinner when loading', () => {
    mockUseNotificationPreferences.mockReturnValue({
      loading: true,
      saving: false,
      error: null,
      isEnabled: vi.fn(),
      updatePreference: vi.fn(),
      isCategoryFullyEnabled: vi.fn(),
      isCategoryPartiallyEnabled: vi.fn(),
      toggleCategory: vi.fn(),
      preferences: {},
    });

    const { container } = render(<NotificationPreferencesPanel />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('renders all 4 category labels', () => {
    setupDefaultPreferences();
    render(<NotificationPreferencesPanel />);

    expect(screen.getByText('Social')).toBeTruthy();
    expect(screen.getByText('Recordatorios')).toBeTruthy();
    expect(screen.getByText('Iniciativas')).toBeTruthy();
    expect(screen.getByText('Logros')).toBeTruthy();
  });

  it('renders category descriptions', () => {
    setupDefaultPreferences();
    render(<NotificationPreferencesPanel />);

    expect(screen.getByText('Interacciones con otros usuarios')).toBeTruthy();
    expect(screen.getByText('Recordatorios para escribir tus whispers')).toBeTruthy();
  });

  it('renders individual notification type labels', () => {
    setupDefaultPreferences();
    render(<NotificationPreferencesPanel />);

    expect(screen.getByText('Likes')).toBeTruthy();
    expect(screen.getByText('Nuevos seguidores')).toBeTruthy();
    expect(screen.getByText('Recordatorio matutino')).toBeTruthy();
    expect(screen.getByText('Hitos de hábitos')).toBeTruthy();
  });

  it('displays error message when error exists', () => {
    setupDefaultPreferences({ error: 'Error al guardar preferencias' });
    render(<NotificationPreferencesPanel />);

    expect(screen.getByText('Error al guardar preferencias')).toBeTruthy();
  });

  it('calls toggleCategory when master toggle is clicked', async () => {
    const mockToggleCategory = vi.fn();
    setupDefaultPreferences({ toggleCategory: mockToggleCategory });

    render(<NotificationPreferencesPanel />);

    const switches = screen.getAllByRole('switch');
    await userEvent.click(switches[0]);

    expect(mockToggleCategory).toHaveBeenCalledWith('social');
  });

  it('calls updatePreference when individual toggle is clicked', async () => {
    const mockUpdatePreference = vi.fn();
    const mockIsEnabled = vi.fn().mockReturnValue(true);
    setupDefaultPreferences({
      updatePreference: mockUpdatePreference,
      isEnabled: mockIsEnabled,
    });

    render(<NotificationPreferencesPanel />);

    const switches = screen.getAllByRole('switch');
    await userEvent.click(switches[1]);

    expect(mockUpdatePreference).toHaveBeenCalledWith('like', false);
  });

  it('disables toggles when saving', () => {
    setupDefaultPreferences({ saving: true });
    render(<NotificationPreferencesPanel />);

    const switches = screen.getAllByRole('switch');
    for (const toggle of switches) {
      expect(toggle).toBeDisabled();
    }
  });

  it('sets aria-checked to mixed for partial category toggle', () => {
    setupDefaultPreferences({
      isCategoryFullyEnabled: vi.fn().mockReturnValue(false),
      isCategoryPartiallyEnabled: vi.fn().mockReturnValue(true),
    });

    render(<NotificationPreferencesPanel />);

    const switches = screen.getAllByRole('switch');
    expect(switches[0].getAttribute('aria-checked')).toBe('mixed');
  });

  it('sets aria-checked to true for fully enabled category', () => {
    setupDefaultPreferences({
      isCategoryFullyEnabled: vi.fn().mockReturnValue(true),
      isCategoryPartiallyEnabled: vi.fn().mockReturnValue(false),
    });

    render(<NotificationPreferencesPanel />);

    const switches = screen.getAllByRole('switch');
    expect(switches[0].getAttribute('aria-checked')).toBe('true');
  });

  it('sets aria-checked to false for fully disabled category', () => {
    setupDefaultPreferences({
      isCategoryFullyEnabled: vi.fn().mockReturnValue(false),
      isCategoryPartiallyEnabled: vi.fn().mockReturnValue(false),
    });

    render(<NotificationPreferencesPanel />);

    const switches = screen.getAllByRole('switch');
    expect(switches[0].getAttribute('aria-checked')).toBe('false');
  });

  it('renders in night mode styling', () => {
    mockUseTheme.mockReturnValue({ isDay: false });
    setupDefaultPreferences();

    render(<NotificationPreferencesPanel />);

    expect(screen.getByText('Social')).toBeTruthy();
    expect(screen.getByText('Recordatorios')).toBeTruthy();
  });
});
