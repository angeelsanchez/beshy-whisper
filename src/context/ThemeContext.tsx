'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { logger } from '@/lib/logger';

type Theme = 'day' | 'night' | 'auto';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'day' | 'night';
  isDay: boolean;
  setTheme: (theme: Theme) => void;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    formBg: string;
    inputBg: string;
    inputBorder: string;
    tabActive: string;
    tabInactive: string;
    buttonHover: string;
    divider: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function getAutoTheme(): 'day' | 'night' {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = localStorage.getItem('beshy-theme');
    if (stored && ['day', 'night', 'auto'].includes(stored)) {
      return stored as Theme;
    }
  } catch (error) {
    logger.warn('Error reading theme from localStorage', { error: String(error) });
  }
  return 'auto';
}

function setStoredTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('beshy-theme', theme);
  } catch (error) {
    logger.warn('Error saving theme to localStorage', { error: String(error) });
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [actualTheme, setActualTheme] = useState<'day' | 'night'>('day');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);
    
    const resolvedTheme = storedTheme === 'auto' ? getAutoTheme() : storedTheme;
    setActualTheme(resolvedTheme);
    setMounted(true);

    // Apply theme to document immediately
    const htmlElement = document.documentElement;
    htmlElement.className = htmlElement.className.replace(/\b(day-theme|night-theme)\b/g, '');
    htmlElement.classList.add(`${resolvedTheme}-theme`);
  }, []);

  // Handle auto theme updates
  useEffect(() => {
    if (!mounted || theme !== 'auto') return;

    const updateAutoTheme = () => {
      const newAutoTheme = getAutoTheme();
      if (newAutoTheme !== actualTheme) {
        setActualTheme(newAutoTheme);
        
        // Update document class
        const htmlElement = document.documentElement;
        htmlElement.className = htmlElement.className.replace(/\b(day-theme|night-theme)\b/g, '');
        htmlElement.classList.add(`${newAutoTheme}-theme`);
      }
    };

    // Check immediately
    updateAutoTheme();

    // Check every minute for auto theme
    const interval = setInterval(updateAutoTheme, 60000);
    return () => clearInterval(interval);
  }, [theme, actualTheme, mounted]);

  // Handle theme changes
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setStoredTheme(newTheme);

    const resolvedTheme = newTheme === 'auto' ? getAutoTheme() : newTheme;
    setActualTheme(resolvedTheme);

    // Update document class immediately
    if (mounted) {
      const htmlElement = document.documentElement;
      htmlElement.className = htmlElement.className.replace(/\b(day-theme|night-theme)\b/g, '');
      htmlElement.classList.add(`${resolvedTheme}-theme`);
    }

    // Broadcast theme change to other tabs
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('beshy-theme-changed', Date.now().toString());
    }
  };

  // Listen for theme changes from other tabs
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'beshy-theme-changed') {
        const newStoredTheme = getStoredTheme();
        if (newStoredTheme !== theme) {
          setThemeState(newStoredTheme);
          const resolvedTheme = newStoredTheme === 'auto' ? getAutoTheme() : newStoredTheme;
          setActualTheme(resolvedTheme);
          
          // Update document class
          const htmlElement = document.documentElement;
          htmlElement.className = htmlElement.className.replace(/\b(day-theme|night-theme)\b/g, '');
          htmlElement.classList.add(`${resolvedTheme}-theme`);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [theme, mounted]);

  // Generate colors based on actual theme
  const isDay = actualTheme === 'day';
  const colors = {
    primary: isDay ? 'var(--day-accent)' : 'var(--night-accent)',
    secondary: isDay ? 'var(--day-bg)' : 'var(--night-bg)',
    background: isDay ? 'var(--day-bg)' : 'var(--night-bg)',
    text: isDay ? 'var(--day-accent)' : 'var(--night-accent)',
    formBg: isDay ? 'var(--day-bg)' : 'var(--night-bg)',
    inputBg: isDay ? '#FFFFFF' : '#382723',
    inputBorder: isDay ? 'var(--day-accent)' : 'var(--night-accent)',
    tabActive: isDay ? 'var(--day-accent)' : 'var(--night-accent)',
    tabInactive: isDay ? 'var(--day-bg)' : 'var(--night-bg)',
    buttonHover: isDay ? '#4A2E1B' : '#F5F0E1',
    divider: isDay ? 'rgba(74, 46, 27, 0.2)' : 'rgba(245, 240, 225, 0.2)',
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      actualTheme,
      isDay,
      setTheme,
      colors
    }}>
      {children}
    </ThemeContext.Provider>
  );
}