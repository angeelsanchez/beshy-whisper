import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockUseAuthSession } = vi.hoisted(() => {
  const mockUseAuthSession = vi.fn();
  return { mockUseAuthSession };
});

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: mockUseAuthSession,
}));

vi.mock('@/utils/format-utils', () => ({
  formatLikeCount: (n: number) => String(n),
}));

global.fetch = vi.fn();

import RepostButton from '../RepostButton';

describe('RepostButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reposted: false, count: 0 }),
    });
  });

  it('renders with initial count', () => {
    render(<RepostButton entryId="550e8400-e29b-41d4-a716-446655440000" initialRepostCount={5} />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('renders repost button with aria label', () => {
    render(<RepostButton entryId="550e8400-e29b-41d4-a716-446655440000" />);
    expect(screen.getByRole('button', { name: 'Repostear' })).toBeDefined();
  });

  it('is disabled for unauthenticated users', () => {
    mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
    render(<RepostButton entryId="550e8400-e29b-41d4-a716-446655440000" />);
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
  });

  it('toggles repost on click', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reposted: false, count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, reposted: true }),
      });

    render(<RepostButton entryId="550e8400-e29b-41d4-a716-446655440000" initialRepostCount={0} />);

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Repostear' });
    await user.click(button);

    expect(global.fetch).toHaveBeenCalledWith('/api/reposts', expect.objectContaining({ method: 'POST' }));
  });

  it('shows error for temp posts', async () => {
    render(<RepostButton entryId="temp-12345" />);

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Repostear' });
    await user.click(button);

    expect(screen.getByText('Este post aún se está guardando, espera un momento')).toBeDefined();
  });
});
