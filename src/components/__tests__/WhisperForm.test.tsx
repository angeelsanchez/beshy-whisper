import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mockUseSession = vi.hoisted(() => vi.fn());
const mockUseRouter = vi.hoisted(() => vi.fn());
const mockUsePostContext = vi.hoisted(() => vi.fn());
const mockUseActiveChallenge = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());
const mockAddLocalPost = vi.hoisted(() => vi.fn());
const mockRefreshPosts = vi.hoisted(() => vi.fn());
const mockSupabaseFrom = vi.hoisted(() => vi.fn());

vi.mock('next-auth/react', () => ({
  useSession: mockUseSession,
}));

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
}));

vi.mock('@/context/PostContext', () => ({
  usePostContext: mockUsePostContext,
}));

vi.mock('@/hooks/useActiveChallenge', () => ({
  useActiveChallenge: mockUseActiveChallenge,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

vi.mock('../PromptSuggestions', () => ({
  default: ({ onSelect }: { onSelect: (text: string) => void }) => (
    <button type="button" onClick={() => onSelect('Prompt text')}>
      Suggestion
    </button>
  ),
}));

vi.mock('../MoodSelector', () => ({
  default: ({ onChange }: { onChange: (mood: string) => void }) => (
    <button type="button" onClick={() => onChange('happy')}>
      Select Mood
    </button>
  ),
}));

vi.mock('../ChallengeToggle', () => ({
  default: ({ onChange }: { onChange: (checked: boolean) => void }) => (
    <button type="button" onClick={() => onChange(true)}>
      Challenge Toggle
    </button>
  ),
}));

vi.mock('../WhisperHabitSelector', () => ({
  default: () => <div data-testid="habit-selector" />,
}));

vi.mock('../ManifestationSection', () => ({
  default: () => <div data-testid="manifestation-section" />,
}));

vi.mock('../ManifestationCelebrationModal', () => ({
  default: () => <div data-testid="manifestation-celebration-modal" />,
}));

import WhisperForm from '../WhisperForm';

const mockPush = vi.fn();
const SESSION_USER = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  alias: 'BSY001',
};

const DAY_TIMESTAMP = new Date('2026-02-21T10:00:00').getTime();
const NIGHT_TIMESTAMP = new Date('2026-02-21T22:00:00').getTime();

function setupDefaultMocks() {
  mockUseSession.mockReturnValue({ data: { user: SESSION_USER } });
  mockUseRouter.mockReturnValue({ push: mockPush });
  mockUsePostContext.mockReturnValue({
    addLocalPost: mockAddLocalPost,
    refreshPosts: mockRefreshPosts,
    entries: [],
    loading: false,
  });
  mockUseActiveChallenge.mockReturnValue({ challenge: null, participantCount: 0, loading: false });
  globalThis.fetch = mockFetch;
  mockFetch.mockImplementation((url: string) => {
    if (url === '/api/user/settings') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ defaultPostPrivacy: 'public' }) });
    }
    if (url?.includes('ipify.org') || url?.includes('ip.sb')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ip: '1.2.3.4' }) });
    }
    if (url === '/api/objectives/today?franja=DIA') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ objectives: [] }) });
    }
    if (url === '/api/objectives/previous-week') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ objectives: [] }) });
    }
    if (url === '/api/posts/create') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entry: { id: 'real-entry-id' } }),
        clone: () => ({
          json: () => Promise.resolve({ entry: { id: 'real-entry-id' } }),
        }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });

  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    data: [],
    error: null,
  });
}

function typeInTextarea(textarea: HTMLElement, value: string) {
  fireEvent.change(textarea, { target: { value } });
}

describe('WhisperForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(DAY_TIMESTAMP);
    vi.clearAllMocks();
    setupDefaultMocks();

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic rendering', () => {
    it('renders the textarea', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: /guardar susurro/i })).toBeInTheDocument();
    });

    it('renders the textarea label', () => {
      render(<WhisperForm />);
      expect(screen.getByText(/escribe tu whisper aqui/i)).toBeInTheDocument();
    });

    it('renders the Diaria tab button', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: 'Diaria' })).toBeInTheDocument();
    });

    it('renders the Semanal tab button', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: 'Semanal' })).toBeInTheDocument();
    });

    it('renders character counter at zero initially', () => {
      render(<WhisperForm />);
      expect(screen.getByText('0/300')).toBeInTheDocument();
    });

    it('renders the private checkbox for authenticated users', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('checkbox', { name: /susurro es solo para mí/i })).toBeInTheDocument();
    });

    it('does not render private checkbox for unauthenticated users', () => {
      mockUseSession.mockReturnValue({ data: null });
      render(<WhisperForm />);
      expect(screen.queryByRole('checkbox', { name: /susurro es solo para mí/i })).not.toBeInTheDocument();
    });

    it('shows daytime heading when it is 10am', () => {
      render(<WhisperForm />);
      expect(screen.getByText(/establece tus objetivos diarios/i)).toBeInTheDocument();
    });

    it('shows nighttime heading when system time is night', () => {
      vi.setSystemTime(NIGHT_TIMESTAMP);
      render(<WhisperForm />);
      expect(screen.getByText(/reflexiona y agradece/i)).toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('defaults to Diaria mode at daytime', () => {
      render(<WhisperForm />);
      expect(screen.getByText(/establece tus objetivos diarios/i)).toBeInTheDocument();
    });

    it('switches to Semanal mode when clicking Semanal tab', () => {
      render(<WhisperForm />);
      fireEvent.click(screen.getByRole('button', { name: 'Semanal' }));
      expect(screen.getByText(/reflexión semanal/i)).toBeInTheDocument();
    });

    it('switches back to Diaria mode when clicking Diaria tab', () => {
      render(<WhisperForm />);
      fireEvent.click(screen.getByRole('button', { name: 'Semanal' }));
      fireEvent.click(screen.getByRole('button', { name: 'Diaria' }));
      expect(screen.getByText(/establece tus objetivos diarios/i)).toBeInTheDocument();
    });
  });

  describe('textarea interaction', () => {
    it('updates character counter when typing', () => {
      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'Hello');
      expect(screen.getByText('5/300')).toBeInTheDocument();
    });

    it('updates counter correctly for longer text', () => {
      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'a'.repeat(150));
      expect(screen.getByText('150/300')).toBeInTheDocument();
    });

    it('hides prompt suggestions when textarea has content', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: 'Suggestion' })).toBeInTheDocument();
      typeInTextarea(screen.getByRole('textbox'), 'Hello');
      expect(screen.queryByRole('button', { name: 'Suggestion' })).not.toBeInTheDocument();
    });

    it('shows prompt suggestions when textarea is empty', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: 'Suggestion' })).toBeInTheDocument();
    });

    it('fills textarea when a prompt suggestion is selected', () => {
      render(<WhisperForm />);
      fireEvent.click(screen.getByRole('button', { name: 'Suggestion' }));
      expect(screen.getByRole('textbox')).toHaveValue('Prompt text');
    });

    it('disables submit button when textarea is empty', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: /guardar susurro/i })).toBeDisabled();
    });

    it('enables submit button when textarea has content', () => {
      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'Some text');
      expect(screen.getByRole('button', { name: /guardar susurro/i })).not.toBeDisabled();
    });

    it('disables submit button when message exceeds 300 characters', () => {
      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'a'.repeat(301));
      expect(screen.getByRole('button', { name: /guardar susurro/i })).toBeDisabled();
    });
  });

  describe('objective management', () => {
    it('renders add objective button in Diaria mode at daytime', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: /añadir objetivo/i })).toBeInTheDocument();
    });

    it('does not render add objective button in night mode', () => {
      vi.setSystemTime(NIGHT_TIMESTAMP);
      render(<WhisperForm />);
      expect(screen.queryByRole('button', { name: /añadir objetivo/i })).not.toBeInTheDocument();
    });

    it('adds an objective input when add objective button is clicked', () => {
      render(<WhisperForm />);
      fireEvent.click(screen.getByRole('button', { name: /añadir objetivo/i }));
      expect(screen.getByPlaceholderText(/escribe tu objetivo aqui/i)).toBeInTheDocument();
    });

    it('removes objective when delete button is clicked', () => {
      render(<WhisperForm />);
      fireEvent.click(screen.getByRole('button', { name: /añadir objetivo/i }));
      expect(screen.getByPlaceholderText(/escribe tu objetivo aqui/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /eliminar objetivo/i }));
      expect(screen.queryByPlaceholderText(/escribe tu objetivo aqui/i)).not.toBeInTheDocument();
    });

    it('shows error when trying to add more than 15 objectives', () => {
      render(<WhisperForm />);
      const addButton = screen.getByRole('button', { name: /añadir objetivo/i });
      for (let i = 0; i < 15; i++) {
        fireEvent.click(addButton);
      }
      fireEvent.click(addButton);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/máximo 15 objetivos/i)).toBeInTheDocument();
    });

    it('allows typing in objective input', () => {
      render(<WhisperForm />);
      fireEvent.click(screen.getByRole('button', { name: /añadir objetivo/i }));
      const objectiveInput = screen.getByPlaceholderText(/escribe tu objetivo aqui/i);
      fireEvent.change(objectiveInput, { target: { value: 'My goal' } });
      expect(objectiveInput).toHaveValue('My goal');
    });

    it('adds a new objective on Enter key in objective input', () => {
      render(<WhisperForm />);
      fireEvent.click(screen.getByRole('button', { name: /añadir objetivo/i }));
      const objectiveInput = screen.getByPlaceholderText(/escribe tu objetivo aqui/i);
      fireEvent.keyDown(objectiveInput, { key: 'Enter', code: 'Enter' });
      const inputs = screen.getAllByPlaceholderText(/escribe tu objetivo aqui/i);
      expect(inputs).toHaveLength(2);
    });

    it('adds multiple objectives correctly', () => {
      render(<WhisperForm />);
      const addButton = screen.getByRole('button', { name: /añadir objetivo/i });
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      expect(screen.getAllByPlaceholderText(/escribe tu objetivo aqui/i)).toHaveLength(3);
    });
  });

  describe('form validation on submit', () => {
    it('submit button is disabled when message is empty', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: /guardar susurro/i })).toBeDisabled();
    });

    it('shows error when submitting empty message via form submit', () => {
      render(<WhisperForm />);
      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/por favor escribe un mensaje/i)).toBeInTheDocument();
    });

    it('does not call API when message is empty', () => {
      render(<WhisperForm />);
      mockFetch.mockClear();
      const form = document.querySelector('form');
      if (form) fireEvent.submit(form);
      const postCalls = mockFetch.mock.calls.filter(([url]: [string]) => url === '/api/posts/create');
      expect(postCalls).toHaveLength(0);
    });
  });

  describe('private post toggle', () => {
    it('toggles private checkbox when clicked', () => {
      render(<WhisperForm />);
      const checkbox = screen.getByRole('checkbox', { name: /susurro es solo para mí/i });
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('shows lock icon in the private checkbox label area', () => {
      render(<WhisperForm />);
      const svgs = document.querySelectorAll('label[for="isPrivate"] svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('successful submission', () => {
    it('shows success toast after submitting', async () => {
      vi.useRealTimers();
      setupDefaultMocks();

      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'My whisper message');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('clears textarea after successful submission', async () => {
      vi.useRealTimers();
      setupDefaultMocks();

      render(<WhisperForm />);
      const textarea = screen.getByRole('textbox');
      typeInTextarea(textarea, 'My whisper message');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      }, { timeout: 5000 });
    });

    it('calls addLocalPost before API call', async () => {
      vi.useRealTimers();
      setupDefaultMocks();

      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'My whisper');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockAddLocalPost).toHaveBeenCalledTimes(1);
      }, { timeout: 5000 });
    });

    it('addLocalPost is called with correct message', async () => {
      vi.useRealTimers();
      setupDefaultMocks();

      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'Test message');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockAddLocalPost).toHaveBeenCalledWith(
          expect.objectContaining({
            mensaje: 'Test message',
            user_id: SESSION_USER.id,
            guest: false,
          })
        );
      }, { timeout: 5000 });
    });
  });

  describe('error handling on submission', () => {
    it('shows error from API response', async () => {
      vi.useRealTimers();
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/user/settings') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ defaultPostPrivacy: 'public' }) });
        }
        if (url?.includes('ipify.org') || url?.includes('ip.sb')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ip: '1.2.3.4' }) });
        }
        if (url === '/api/posts/create') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Ya has publicado hoy' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'My whisper');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Ya has publicado hoy')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('guest user flow', () => {
    it('renders form for guest users', () => {
      mockUseSession.mockReturnValue({ data: null });
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: vi.fn((key: string) => (key === 'isGuest' ? 'true' : null)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
      });
      render(<WhisperForm />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('unauthenticated user redirect', () => {
    it('redirects to login when not guest and not authenticated', async () => {
      vi.useRealTimers();
      mockUseSession.mockReturnValue({ data: null });

      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
      });

      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'My whisper message');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      }, { timeout: 5000 });
    });
  });

  describe('accessibility', () => {
    it('has accessible label for textarea', () => {
      render(<WhisperForm />);
      const textarea = screen.getByLabelText(/escribe tu whisper aqui/i);
      expect(textarea).toBeInTheDocument();
    });

    it('has accessible label for submit button', () => {
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: /guardar susurro/i })).toBeInTheDocument();
    });

    it('error message has role="alert"', () => {
      render(<WhisperForm />);
      const form = document.querySelector('form');
      if (form) fireEvent.submit(form);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('success toast has role="status"', async () => {
      vi.useRealTimers();
      setupDefaultMocks();

      render(<WhisperForm />);
      typeInTextarea(screen.getByRole('textbox'), 'My whisper message');
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('active challenge integration', () => {
    it('renders ChallengeToggle when there is an active challenge and user is authenticated', () => {
      mockUseActiveChallenge.mockReturnValue({
        challenge: {
          id: 'ch-1',
          title: 'Challenge',
          description: 'desc',
          is_active: true,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
        },
        participantCount: 10,
        loading: false,
      });
      render(<WhisperForm />);
      expect(screen.getByRole('button', { name: 'Challenge Toggle' })).toBeInTheDocument();
    });

    it('does not render ChallengeToggle when there is no active challenge', () => {
      mockUseActiveChallenge.mockReturnValue({ challenge: null, participantCount: 0, loading: false });
      render(<WhisperForm />);
      expect(screen.queryByRole('button', { name: 'Challenge Toggle' })).not.toBeInTheDocument();
    });
  });
});
