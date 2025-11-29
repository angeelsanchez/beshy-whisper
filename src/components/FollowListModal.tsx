'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import FollowButton from './FollowButton';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface FollowUser {
  id: string;
  alias: string;
  bsy_id: string;
  name: string;
  isFollowedByMe: boolean;
}

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  isDay: boolean;
}

export default function FollowListModal({ isOpen, onClose, userId, type, isDay }: Readonly<FollowListModalProps>) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { isActive: isOpen, onClose });

  const fetchUsers = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        type,
        page: String(pageNum),
        limit: String(limit),
      });

      const res = await fetch(`/api/follows/list?${params}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUsers(pageNum === 1 ? data.users : prev => [...prev, ...data.users]);
      setTotal(data.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    if (isOpen) {
      setUsers([]);
      setPage(1);
      fetchUsers(1);
    }
  }, [isOpen, fetchUsers]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers(nextPage);
  };

  if (!isOpen) return null;

  const hasMore = users.length < total;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" aria-hidden="true" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-modal-title"
        className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto max-h-[70vh] rounded-xl shadow-xl z-50 flex flex-col ${
          isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
        }`}
      >
        <div className={`flex items-center justify-between p-4 border-b ${
          isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'
        }`}>
          <h3 id="follow-modal-title" className={`font-bold text-lg ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            {type === 'followers' ? 'Seguidores' : 'Siguiendo'} ({total})
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDay ? 'hover:bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'hover:bg-[#F5F0E1]/10 text-[#F5F0E1]'
            }`}
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {users.length === 0 && !loading && (
            <p className={`text-center text-sm opacity-70 py-8 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
              {type === 'followers' ? 'No tiene seguidores aun' : 'No sigue a nadie aun'}
            </p>
          )}

          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className={`flex items-center justify-between p-3 rounded-lg ${
                isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
              }`}>
                <Link
                  href={`/profile?user=${user.id}`}
                  onClick={onClose}
                  className={`flex-1 min-w-0 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
                >
                  <p className="font-medium text-sm truncate">{user.name || user.alias}</p>
                  <p className="text-xs opacity-60 truncate">{user.bsy_id || user.alias}</p>
                </Link>
                <div className="ml-3 flex-shrink-0">
                  <FollowButton targetUserId={user.id} isDay={isDay} compact />
                </div>
              </div>
            ))}
          </div>

          {loading && (
            <div aria-live="polite" className={`text-center py-4 text-sm opacity-70 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
              Cargando...
            </div>
          )}

          {hasMore && !loading && (
            <button
              onClick={loadMore}
              className={`w-full mt-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDay
                  ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] hover:bg-[#4A2E1B]/20'
                  : 'bg-[#F5F0E1]/10 text-[#F5F0E1] hover:bg-[#F5F0E1]/20'
              }`}
            >
              Ver mas
            </button>
          )}
        </div>
      </div>
    </>
  );
}
