'use client';

import { resolveIcon } from '@/lib/icon-map';

interface AppIconProps {
  readonly identifier: string;
  readonly type?: 'habit' | 'mood' | 'category';
  readonly className?: string;
  readonly strokeWidth?: number;
  readonly color?: string;
}

export default function AppIcon({
  identifier,
  type = 'habit',
  className = 'w-5 h-5',
  strokeWidth = 2,
  color,
}: AppIconProps): React.ReactElement {
  const IconComponent = resolveIcon(identifier, type);

  if (IconComponent) {
    return <IconComponent className={className} strokeWidth={strokeWidth} color={color} />;
  }

  return <span className={`inline-flex items-center justify-center ${className}`}>{identifier}</span>;
}
