'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchUser {
  readonly id: string;
  readonly alias: string;
  readonly bsy_id: string;
  readonly name: string;
  readonly profile_photo_url: string | null;
  readonly bio: string | null;
  readonly isFollowedByMe: boolean;
}

interface SearchState {
  readonly users: readonly SearchUser[];
  readonly total: number;
  readonly loading: boolean;
  readonly query: string;
  readonly page: number;
  readonly hasMore: boolean;
}

const DEBOUNCE_MS = 300;
const LIMIT = 20;

export function useUserSearch(): {
  users: readonly SearchUser[];
  total: number;
  loading: boolean;
  query: string;
  hasMore: boolean;
  setQuery: (q: string) => void;
  loadMore: () => void;
} {
  const [state, setState] = useState<SearchState>({
    users: [],
    total: 0,
    loading: false,
    query: '',
    page: 1,
    hasMore: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchResults = useCallback(async (query: string, page: number, append: boolean) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, users: [], total: 0, loading: false, hasMore: false }));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        page: String(page),
        limit: String(LIMIT),
      });

      const res = await fetch(`/api/users/search?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const data: { users: SearchUser[]; total: number } = await res.json();

      setState(prev => {
        const merged = append ? [...prev.users, ...data.users] : data.users;
        return {
          ...prev,
          users: merged,
          total: data.total,
          loading: false,
          page,
          hasMore: merged.length < data.total,
        };
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const setQuery = useCallback((newQuery: string) => {
    setState(prev => ({ ...prev, query: newQuery, page: 1 }));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!newQuery.trim()) {
      setState(prev => ({ ...prev, users: [], total: 0, hasMore: false, loading: false }));
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(newQuery, 1, false);
    }, DEBOUNCE_MS);
  }, [fetchResults]);

  const loadMore = useCallback(() => {
    if (state.loading || !state.hasMore) return;
    fetchResults(state.query, state.page + 1, true);
  }, [state.loading, state.hasMore, state.query, state.page, fetchResults]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    users: state.users,
    total: state.total,
    loading: state.loading,
    query: state.query,
    hasMore: state.hasMore,
    setQuery,
    loadMore,
  };
}
