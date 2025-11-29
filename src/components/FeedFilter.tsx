'use client';

interface FeedFilterProps {
  filter: 'all' | 'following';
  onFilterChange: (filter: 'all' | 'following') => void;
  isDay: boolean;
  isAuthenticated: boolean;
}

export default function FeedFilter({ filter, onFilterChange, isDay, isAuthenticated }: FeedFilterProps) {
  if (!isAuthenticated) return null;

  return (
    <div className={`flex gap-2 mb-6 p-1 rounded-lg ${
      isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
    }`}>
      <button
        onClick={() => onFilterChange('all')}
        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
          filter === 'all'
            ? isDay
              ? 'bg-[#4A2E1B] text-[#F5F0E1] shadow-sm'
              : 'bg-[#F5F0E1] text-[#2D1E1A] shadow-sm'
            : isDay
              ? 'text-[#4A2E1B] hover:bg-[#4A2E1B]/10'
              : 'text-[#F5F0E1] hover:bg-[#F5F0E1]/10'
        }`}
      >
        Todos
      </button>
      <button
        onClick={() => onFilterChange('following')}
        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
          filter === 'following'
            ? isDay
              ? 'bg-[#4A2E1B] text-[#F5F0E1] shadow-sm'
              : 'bg-[#F5F0E1] text-[#2D1E1A] shadow-sm'
            : isDay
              ? 'text-[#4A2E1B] hover:bg-[#4A2E1B]/10'
              : 'text-[#F5F0E1] hover:bg-[#F5F0E1]/10'
        }`}
      >
        Siguiendo
      </button>
    </div>
  );
}
