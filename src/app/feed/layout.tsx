import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Feed',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FeedLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
