'use client';

import { useTheme } from '@/context/ThemeContext';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 80,
};

function getInitial(name?: string | null): string {
  if (!name || name.trim().length === 0) return '?';
  return name.trim().charAt(0).toUpperCase();
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const { isDay } = useTheme();
  const px = SIZE_MAP[size];
  const fontSize = Math.round(px * 0.4);

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        width={px}
        height={px}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: px, height: px }}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-semibold select-none ${className}`}
      style={{
        width: px,
        height: px,
        fontSize,
        backgroundColor: isDay ? '#4A2E1B' : '#F5F0E1',
        color: isDay ? '#F5F0E1' : '#4A2E1B',
      }}
      aria-label={name || 'Avatar'}
    >
      {getInitial(name)}
    </div>
  );
}
