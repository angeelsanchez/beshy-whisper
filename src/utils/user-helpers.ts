/**
 * Utility functions for user authentication and management
 */

import { Session } from 'next-auth';

/**
 * Get the current user ID from session or localStorage
 * @param session The current NextAuth session
 * @returns The user ID or null if not available
 */
export function getCurrentUserId(session: Session | null): string | null {
  // First try to get from session
  if (session?.user?.id) {
    // Store in localStorage for fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('beshy-user-id', session.user.id);
    }
    return session.user.id;
  }
  
  // Try to get from localStorage as fallback
  if (typeof window !== 'undefined') {
    const storedUserId = localStorage.getItem('beshy-user-id');
    if (storedUserId) {
      return storedUserId;
    }
  }
  
  return null;
}

/**
 * Check if a string is a valid UUID
 * @param uuid The string to check
 * @returns True if the string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
} 