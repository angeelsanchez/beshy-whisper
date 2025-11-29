'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import ManifestationCard from '@/components/ManifestationCard';
import type { Manifestation, FulfilledManifestation } from '@/hooks/useManifestations';

interface ManifestationSectionProps {
  readonly isDay: boolean;
  readonly userId: string;
  readonly onSelectionChange: (selectedIds: string[]) => void;
  readonly onFulfilled?: (manifestation: FulfilledManifestation) => void;
}

export default function ManifestationSection({
  isDay,
  userId,
  onSelectionChange,
  onFulfilled,
}: ManifestationSectionProps): React.ReactElement | null {
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchManifestations = async () => {
      try {
        const res = await fetch('/api/manifestations');
        if (!res.ok) {
          setLoading(false);
          return;
        }

        const data = await res.json();
        setManifestations(data.manifestations ?? []);

        const notReaffirmedTodayIds = new Set<string>(
          (data.manifestations ?? [])
            .filter((m: Manifestation) => !m.reaffirmedToday)
            .map((m: Manifestation) => m.id)
        );
        setSelectedIds(notReaffirmedTodayIds);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchManifestations();
  }, [userId]);

  useEffect(() => {
    onSelectionChange(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  const toggleManifestation = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = useCallback(async () => {
    if (!newContent.trim() || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/manifestations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setManifestations((prev) => [data.manifestation, ...prev]);
        setSelectedIds((prev) => new Set([...prev, data.manifestation.id]));
        setNewContent('');
        setShowCreateForm(false);
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }, [newContent, creating]);

  const handleFulfill = useCallback(
    async (id: string) => {
      try {
        const res = await fetch('/api/manifestations/fulfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifestationId: id }),
        });

        if (res.ok) {
          const data = await res.json();
          setManifestations((prev) => prev.filter((m) => m.id !== id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          onFulfilled?.(data.manifestation);
        }
      } catch {
        // silently fail
      }
    },
    [onFulfilled]
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/manifestations/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setManifestations((prev) => prev.filter((m) => m.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      // silently fail
    }
  }, []);

  if (loading) return null;

  const selectedCount = selectedIds.size;
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const bgButton = isDay
    ? 'bg-[#4A2E1B]/8 hover:bg-[#4A2E1B]/12'
    : 'bg-[#F5F0E1]/8 hover:bg-[#F5F0E1]/12';
  const bgExpanded = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${bgButton} ${textColor}`}
      >
        <Sparkles className="w-4 h-4" strokeWidth={2} />
        <span className="flex-1 text-left">
          Mis manifestaciones
          {manifestations.length > 0 && (
            <span className="ml-1.5 text-xs opacity-60">
              ({manifestations.length})
            </span>
          )}
          {selectedCount > 0 && (
            <span className="ml-1 text-xs opacity-60">
              · {selectedCount} para reafirmar
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" strokeWidth={2} />
        ) : (
          <ChevronDown className="w-4 h-4" strokeWidth={2} />
        )}
      </button>

      {expanded && (
        <div className={`mt-2 rounded-lg p-3 space-y-1 ${bgExpanded}`}>
          <p className={`text-[11px] mb-2 ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
            Selecciona las manifestaciones que quieres reafirmar esta noche
          </p>

          {manifestations.map((m) => (
            <ManifestationCard
              key={m.id}
              manifestation={m}
              isDay={isDay}
              isSelected={selectedIds.has(m.id)}
              onToggle={() => toggleManifestation(m.id)}
              onFulfill={() => handleFulfill(m.id)}
              onDelete={() => handleDelete(m.id)}
            />
          ))}

          {manifestations.length === 0 && !showCreateForm && (
            <p className={`text-xs text-center py-3 ${isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'}`}>
              Aún no tienes manifestaciones activas
            </p>
          )}

          {showCreateForm ? (
            <div className="pt-2">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Escribe lo que quieres manifestar..."
                maxLength={200}
                rows={2}
                className={`w-full px-3 py-2 text-xs rounded-lg border resize-none ${
                  isDay
                    ? 'bg-white border-[#4A2E1B]/20 text-[#4A2E1B] placeholder-[#4A2E1B]/40'
                    : 'bg-[#2D1E1A] border-[#F5F0E1]/20 text-[#F5F0E1] placeholder-[#F5F0E1]/40'
                }`}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newContent.trim() || creating}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    !newContent.trim() || creating
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  } ${
                    isDay
                      ? 'bg-[#4A2E1B] text-white'
                      : 'bg-[#F5F0E1] text-[#2D1E1A]'
                  }`}
                >
                  {creating ? 'Creando...' : 'Crear manifestación'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewContent('');
                  }}
                  className={`p-1.5 rounded-lg ${bgButton} ${textColor}`}
                  aria-label="Cancelar"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
              <p className={`text-[10px] mt-1 ${isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'}`}>
                {newContent.length}/200 caracteres
              </p>
            </div>
          ) : (
            manifestations.length < 5 && (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className={`flex items-center gap-1.5 w-full px-2.5 py-2 rounded-md text-xs transition-all opacity-60 hover:opacity-80 ${textColor}`}
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                <span>Agregar manifestación</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
