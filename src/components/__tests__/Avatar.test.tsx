import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseTheme = vi.hoisted(() => vi.fn());

vi.mock('@/context/ThemeContext', () => ({
  useTheme: mockUseTheme,
}));

import Avatar from '../Avatar';

const dayTheme = {
  theme: 'day' as const,
  actualTheme: 'day' as const,
  isDay: true,
  setTheme: vi.fn(),
  colors: {
    primary: '#4A2E1B',
    secondary: '#F5F0E1',
    background: '#F5F0E1',
    text: '#4A2E1B',
    formBg: '#F5F0E1',
    inputBg: '#FFFFFF',
    inputBorder: '#4A2E1B',
    tabActive: '#4A2E1B',
    tabInactive: '#F5F0E1',
    buttonHover: '#4A2E1B',
    divider: 'rgba(74, 46, 27, 0.2)',
  },
};

const nightTheme = { ...dayTheme, actualTheme: 'night' as const, isDay: false };

describe('Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue(dayTheme);
  });

  describe('with image src', () => {
    it('renders an img element when src is provided', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="John Doe" />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('uses name as alt text when provided', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="Jane Smith" />);
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Jane Smith');
    });

    it('uses default alt text when name is not provided', () => {
      render(<Avatar src="https://example.com/photo.jpg" />);
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Avatar');
    });

    it('applies md size dimensions by default (48x48)', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="User" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('width', '48');
      expect(img).toHaveAttribute('height', '48');
    });

    it('applies sm size dimensions (32x32)', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="User" size="sm" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('width', '32');
      expect(img).toHaveAttribute('height', '32');
    });

    it('applies lg size dimensions (80x80)', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="User" size="lg" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('width', '80');
      expect(img).toHaveAttribute('height', '80');
    });

    it('applies additional className', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="User" className="extra-class" />);
      expect(screen.getByRole('img')).toHaveClass('extra-class');
    });

    it('always includes rounded-full and object-cover classes', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="User" />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('rounded-full');
      expect(img).toHaveClass('object-cover');
    });

    it('does not render a fallback div when src is provided', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="User" />);
      expect(screen.queryByRole('img', { hidden: false })).toBeInTheDocument();
      const divs = document.querySelectorAll('div');
      divs.forEach((div) => {
        expect(div).not.toHaveStyle({ borderRadius: '50%' });
      });
    });
  });

  describe('without image src (fallback)', () => {
    it('renders a div with the first letter of the name in day theme', () => {
      render(<Avatar name="Alice" />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('renders uppercase initial', () => {
      render(<Avatar name="bob" />);
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('renders "?" when name is not provided', () => {
      render(<Avatar />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders "?" when name is null', () => {
      render(<Avatar name={null} />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders "?" when name is empty string', () => {
      render(<Avatar name="" />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders "?" when name is only whitespace', () => {
      render(<Avatar name="   " />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('trims name before getting initial', () => {
      render(<Avatar name="  Carlos" />);
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('applies day theme colors when isDay is true', () => {
      mockUseTheme.mockReturnValue(dayTheme);
      render(<Avatar name="User" />);
      const fallback = screen.getByLabelText('User');
      expect(fallback).toHaveStyle({ backgroundColor: '#4A2E1B', color: '#F5F0E1' });
    });

    it('applies night theme colors when isDay is false', () => {
      mockUseTheme.mockReturnValue(nightTheme);
      render(<Avatar name="User" />);
      const fallback = screen.getByLabelText('User');
      expect(fallback).toHaveStyle({ backgroundColor: '#F5F0E1', color: '#4A2E1B' });
    });

    it('uses name as aria-label', () => {
      render(<Avatar name="John" />);
      expect(screen.getByLabelText('John')).toBeInTheDocument();
    });

    it('uses "Avatar" as aria-label when name is not provided', () => {
      render(<Avatar />);
      expect(screen.getByLabelText('Avatar')).toBeInTheDocument();
    });

    it('applies md size 48px by default', () => {
      render(<Avatar name="User" />);
      const fallback = screen.getByLabelText('User');
      expect(fallback).toHaveStyle({ width: '48px', height: '48px' });
    });

    it('applies sm size 32px', () => {
      render(<Avatar name="User" size="sm" />);
      const fallback = screen.getByLabelText('User');
      expect(fallback).toHaveStyle({ width: '32px', height: '32px' });
    });

    it('applies lg size 80px', () => {
      render(<Avatar name="User" size="lg" />);
      const fallback = screen.getByLabelText('User');
      expect(fallback).toHaveStyle({ width: '80px', height: '80px' });
    });

    it('computes font size proportionally for md (~19px)', () => {
      render(<Avatar name="User" size="md" />);
      const fallback = screen.getByLabelText('User');
      expect(fallback).toHaveStyle({ fontSize: '19px' });
    });

    it('computes font size proportionally for lg (~32px)', () => {
      render(<Avatar name="User" size="lg" />);
      const fallback = screen.getByLabelText('User');
      expect(fallback).toHaveStyle({ fontSize: '32px' });
    });

    it('applies additional className to fallback div', () => {
      render(<Avatar name="User" className="custom-class" />);
      expect(screen.getByLabelText('User')).toHaveClass('custom-class');
    });

    it('applies rounded-full class to fallback div', () => {
      render(<Avatar name="User" />);
      expect(screen.getByLabelText('User')).toHaveClass('rounded-full');
    });
  });

  describe('with null src', () => {
    it('renders fallback when src is null', () => {
      render(<Avatar src={null} name="User" />);
      expect(screen.getByText('U')).toBeInTheDocument();
    });
  });

  describe('click handler via wrapper', () => {
    it('calls onClick on parent container when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <div onClick={handleClick}>
          <Avatar name="User" />
        </div>
      );
      await user.click(screen.getByText('U'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when image avatar is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <div onClick={handleClick}>
          <Avatar src="https://example.com/photo.jpg" name="User" />
        </div>
      );
      await user.click(screen.getByRole('img'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
