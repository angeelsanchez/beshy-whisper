'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useInitiativeDetail } from '@/hooks/useInitiativeDetail';
import { useInitiativeCheckin } from '@/hooks/useInitiativeCheckin';
import { useInitiatives } from '@/hooks/useInitiatives';
import InitiativeProgressRing from '@/components/InitiativeProgressRing';
import InitiativeCheckinButton from '@/components/InitiativeCheckinButton';
import InitiativeWeeklyGrid from '@/components/InitiativeWeeklyGrid';
import InitiativeCommunityStreak from '@/components/InitiativeCommunityStreak';
import InitiativeParticipantList from '@/components/InitiativeParticipantList';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getTrackingLabel(type: string, targetValue: number | null, unit: string | null): string {
  if (type === 'binary') return 'Check-in diario';
  if (type === 'timer' && targetValue && unit) return `${targetValue} ${unit}/día (temporizador)`;
  if (type === 'quantity' && targetValue && unit) return `${targetValue} ${unit}/día`;
  return type;
}

export default function InitiativeDetailPage(): React.ReactElement | null {
  const params = useParams();
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuthSession();
  const { isDay } = useTheme();

  const initiativeId = typeof params?.id === 'string' ? params.id : null;
  const {
    initiative,
    progress,
    participants,
    isJoined,
    userCheckedInToday,
    userTodayValue,
    loading,
    refetch,
  } = useInitiativeDetail(initiativeId);
  const { checkin, checking } = useInitiativeCheckin();
  const { join, leave } = useInitiatives();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [joiningFromDetail, setJoiningFromDetail] = useState(false);

  const bgColor = isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]';
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const subtextColor = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const dividerColor = isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10';
  const sectionBg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';

  const showToastMsg = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const handleCheckin = useCallback(async (value?: number) => {
    if (!initiativeId) return;
    const result = await checkin(initiativeId, value);
    if (result) {
      if (result.milestone) {
        showToastMsg(result.milestone.message);
      } else if (result.community_progress.is_perfect_day) {
        showToastMsg('Día perfecto! Todos completaron hoy');
      }
      refetch();
    }
  }, [initiativeId, checkin, refetch, showToastMsg]);

  const handleLeave = useCallback(async () => {
    if (!initiativeId) return;
    setLeaving(true);
    const success = await leave(initiativeId);
    setLeaving(false);
    if (success) {
      router.push('/habits');
    }
  }, [initiativeId, leave, router]);

  const handleJoinFromDetail = useCallback(async () => {
    if (!initiativeId) return;
    setJoiningFromDetail(true);
    const success = await join(initiativeId);
    setJoiningFromDetail(false);
    if (success) {
      showToastMsg('Te has unido a la iniciativa');
      refetch();
    }
  }, [initiativeId, join, refetch, showToastMsg]);

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgColor}`}>
        <p className={`text-sm ${subtextColor}`}>Cargando...</p>
      </div>
    );
  }

  if (!session) {
    router.replace('/login');
    return null;
  }

  if (!initiative) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${bgColor}`}>
        <p className={`text-sm ${textColor}`}>Iniciativa no encontrada</p>
        <button
          onClick={() => router.push('/habits')}
          className={`text-sm underline ${subtextColor}`}
        >
          Volver
        </button>
      </div>
    );
  }

  const todayProgress = progress?.today;
  const isExpired = initiative.end_date !== null && initiative.end_date < new Date().toISOString().slice(0, 10);

  return (
    <div className={`min-h-screen pb-24 lg:pb-8 lg:pl-20 ${bgColor}`}>
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/habits')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${sectionBg}`}
            aria-label="Volver"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className={textColor}>
              <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {initiative.icon && (
              <span className="text-xl flex-shrink-0">{initiative.icon}</span>
            )}
            <h1 className={`text-lg font-bold truncate ${textColor}`}>
              {initiative.name}
            </h1>
          </div>
        </div>

        <div className="flex justify-center">
          <InitiativeProgressRing
            completedCount={todayProgress?.completed_count ?? 0}
            totalParticipants={todayProgress?.total_participants ?? Math.max(initiative.participant_count, 1)}
            color={initiative.color}
            icon={initiative.icon}
            size={160}
            isDay={isDay}
          />
        </div>

        {isJoined && !isExpired && (
          <InitiativeCheckinButton
            initiativeId={initiative.id}
            trackingType={initiative.tracking_type}
            targetValue={initiative.target_value}
            unit={initiative.unit}
            currentValue={userTodayValue}
            isCheckedIn={userCheckedInToday}
            checking={checking}
            color={initiative.color}
            isDay={isDay}
            onCheckin={handleCheckin}
          />
        )}

        {!isJoined && !isExpired && (
          <button
            onClick={handleJoinFromDetail}
            disabled={joiningFromDetail}
            className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-all ${
              joiningFromDetail ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
            }`}
            style={{ backgroundColor: initiative.color }}
          >
            {joiningFromDetail ? 'Uniéndose...' : 'Unirse a esta iniciativa'}
          </button>
        )}

        {isExpired && (
          <div className={`text-center py-3 rounded-xl text-sm font-medium ${sectionBg} ${subtextColor}`}>
            Esta iniciativa ha finalizado
          </div>
        )}

        {progress && progress.weekly.length > 0 && (
          <section>
            <h2 className={`text-xs font-semibold uppercase mb-2 ${subtextColor}`}>
              Última semana
            </h2>
            <InitiativeWeeklyGrid weekly={progress.weekly} isDay={isDay} />
          </section>
        )}

        {progress && progress.community_streak > 0 && (
          <InitiativeCommunityStreak streak={progress.community_streak} isDay={isDay} />
        )}

        {participants.length > 0 && (
          <section>
            <h2 className={`text-xs font-semibold uppercase mb-2 ${subtextColor}`}>
              Participantes ({participants.length})
            </h2>
            <InitiativeParticipantList
              participants={participants}
              isDay={isDay}
            />
          </section>
        )}

        <div className={`border-t pt-4 space-y-2 ${dividerColor}`}>
          <h2 className={`text-xs font-semibold uppercase ${subtextColor}`}>
            Información
          </h2>
          <p className={`text-sm ${textColor}`}>{initiative.description}</p>
          <div className={`grid grid-cols-2 gap-2 text-xs ${subtextColor}`}>
            <div>
              <span className="font-medium">Inicio:</span> {formatDate(initiative.start_date)}
            </div>
            {initiative.end_date && (
              <div>
                <span className="font-medium">Fin:</span> {formatDate(initiative.end_date)}
              </div>
            )}
            <div>
              <span className="font-medium">Tipo:</span> {getTrackingLabel(initiative.tracking_type, initiative.target_value, initiative.unit)}
            </div>
            {initiative.max_participants && (
              <div>
                <span className="font-medium">Máximo:</span> {initiative.max_participants} personas
              </div>
            )}
            {progress && (
              <div>
                <span className="font-medium">Días activos:</span> {progress.days_completed}/{progress.total_days}
              </div>
            )}
          </div>
        </div>

        {isJoined && (
          <button
            onClick={handleLeave}
            disabled={leaving}
            className={`w-full py-2.5 rounded-xl text-xs font-medium text-red-500/70 transition-all ${
              leaving ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
            } ${sectionBg}`}
          >
            {leaving ? 'Saliendo...' : 'Salir de esta iniciativa'}
          </button>
        )}
      </div>

      {showToast && (
        <div
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
          className="fixed left-1/2 transform -translate-x-1/2 bg-[#4A2E1B] text-[#F5F0E1] px-6 py-3 rounded-lg shadow-lg opacity-90 z-[70]"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
