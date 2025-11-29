'use client';

import { Check, Sparkles, MoreVertical, Trophy, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Manifestation } from '@/hooks/useManifestations';

interface ManifestationCardProps {
  readonly manifestation: Manifestation;
  readonly isDay: boolean;
  readonly isSelected: boolean;
  readonly onToggle: () => void;
  readonly onFulfill: () => void;
  readonly onDelete: () => void;
}

export default function ManifestationCard({
  manifestation,
  isDay,
  isSelected,
  onToggle,
  onFulfill,
  onDelete,
}: ManifestationCardProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const bgSelected = isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10';
  const borderColor = isDay ? 'border-[#4A2E1B]/30' : 'border-[#F5F0E1]/30';
  const accentColor = '#D4A574';

  return (
    <div
      className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-xs transition-all ${
        isSelected ? bgSelected : 'opacity-60 hover:opacity-80'
      } ${textColor}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? 'border-transparent' : borderColor
        }`}
        style={isSelected ? { backgroundColor: accentColor } : undefined}
        aria-label={isSelected ? 'Deseleccionar manifestación' : 'Seleccionar manifestación'}
      >
        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      <Sparkles
        className="w-4 h-4 flex-shrink-0"
        style={{ color: accentColor }}
        strokeWidth={2}
      />

      <span className="flex-1 min-w-0 line-clamp-2 text-left">{manifestation.content}</span>

      <span
        className={`text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded-full ${
          isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
        }`}
      >
        {manifestation.daysManifesting}d
      </span>

      {manifestation.reaffirmedToday && (
        <span className="text-green-500 text-[10px] font-medium flex-shrink-0">Hoy</span>
      )}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          className={`p-1 rounded hover:bg-black/5 ${textColor}`}
          aria-label="Más opciones"
        >
          <MoreVertical className="w-3.5 h-3.5" strokeWidth={2} />
        </button>

        {menuOpen && (
          <div
            className={`absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[140px] ${
              isDay ? 'bg-white' : 'bg-[#3D2E2A]'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onFulfill();
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-black/5 ${textColor}`}
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-500" strokeWidth={2} />
              <span>¡Se cumplió!</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-black/5 text-red-500`}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Eliminar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
