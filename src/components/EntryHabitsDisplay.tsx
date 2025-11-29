'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import AppIcon from '@/components/AppIcon';

interface HabitSnapshot {
  id: string;
  habit_id: string;
  habit_name: string;
  habit_icon: string | null;
  habit_color: string;
  tracking_type: 'binary' | 'quantity' | 'timer';
  target_value: number | null;
  unit: string | null;
  completed_value: number | null;
  is_completed: boolean;
}

interface EntryHabitsDisplayProps {
  readonly entryId: string;
  readonly isDay: boolean;
}

function formatSnapshotValue(value: number | null, unit: string | null): string {
  if (value === null) return '';
  const rounded = value % 1 === 0 ? String(value) : value.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}

export default function EntryHabitsDisplay({ entryId, isDay }: EntryHabitsDisplayProps): React.ReactElement | null {
  const [snapshots, setSnapshots] = useState<HabitSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (entryId.startsWith('temp-')) {
      setLoading(false);
      return;
    }

    const fetchSnapshots = async () => {
      try {
        const { data, error } = await supabase
          .from('entry_habit_snapshots')
          .select('*')
          .eq('entry_id', entryId)
          .order('created_at', { ascending: true });

        if (error) {
          setLoading(false);
          return;
        }

        setSnapshots(data ?? []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, [entryId]);

  if (loading || snapshots.length === 0) return null;

  const completedCount = snapshots.filter(s => s.is_completed).length;

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          isDay
            ? 'bg-[#4A2E1B]/8 text-[#4A2E1B]/70 hover:bg-[#4A2E1B]/12'
            : 'bg-[#F5F0E1]/8 text-[#F5F0E1]/70 hover:bg-[#F5F0E1]/12'
        }`}
      >
        <Target className="w-3.5 h-3.5" strokeWidth={2} />
        <span>{completedCount}/{snapshots.length} hábitos</span>
        {expanded
          ? <ChevronUp className="w-3 h-3" strokeWidth={2} />
          : <ChevronDown className="w-3 h-3" strokeWidth={2} />
        }
      </button>

      {expanded && (
        <div className={`mt-2 rounded-lg p-2.5 space-y-1.5 ${
          isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
        }`}>
          {snapshots.map(snap => (
            <div
              key={snap.id}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs ${
                isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
              }`}
            >
              <span
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: snap.habit_color + '20' }}
              >
                {snap.habit_icon ? (
                  <AppIcon identifier={snap.habit_icon} type="habit" className="w-3.5 h-3.5" />
                ) : snap.is_completed ? (
                  <Check className="w-3 h-3" style={{ color: snap.habit_color }} strokeWidth={2.5} />
                ) : (
                  <X className="w-3 h-3 opacity-40" strokeWidth={2.5} />
                )}
              </span>

              <span className={`flex-1 min-w-0 truncate ${!snap.is_completed ? 'opacity-50 line-through' : ''}`}>
                {snap.habit_name}
              </span>

              {snap.tracking_type !== 'binary' && snap.completed_value !== null && snap.completed_value > 0 && (
                <span className={`tabular-nums flex-shrink-0 ${
                  isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'
                }`}>
                  {formatSnapshotValue(snap.completed_value, snap.unit)}
                  {snap.target_value ? `/${formatSnapshotValue(snap.target_value, null)}` : ''}
                </span>
              )}

              {snap.is_completed ? (
                <Check className="w-3.5 h-3.5 flex-shrink-0 text-green-500" strokeWidth={2.5} />
              ) : (
                <X className="w-3.5 h-3.5 flex-shrink-0 opacity-30" strokeWidth={2.5} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
