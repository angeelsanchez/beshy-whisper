'use client';

import { useState, useEffect } from 'react';
import { FileText, Users, Heart } from 'lucide-react';
import { useStats } from '@/hooks/useStats';
import type { ElementType } from 'react';

interface InitialStats {
  readonly totalEntries: number;
  readonly totalUsers: number;
  readonly totalLikes: number;
}

interface StatItem {
  readonly number: string;
  readonly label: string;
  readonly Icon: ElementType;
  readonly gradient: string;
}

function formatStat(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M+`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K+`;
  }
  return `${value}+`;
}

export default function LiveStatsSection({ initialStats }: { readonly initialStats: InitialStats }) {
  const { totalEntries, totalUsers, totalLikes, loading } = useStats();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const entries = loading ? initialStats.totalEntries : totalEntries;
  const users = loading ? initialStats.totalUsers : totalUsers;
  const likes = loading ? initialStats.totalLikes : totalLikes;

  const stats: readonly StatItem[] = [
    {
      number: formatStat(entries),
      label: 'Susurros Creados',
      Icon: FileText,
      gradient: 'from-amber-400 to-orange-500',
    },
    {
      number: formatStat(users),
      label: 'Usuarios Activos',
      Icon: Users,
      gradient: 'from-blue-400 to-purple-500',
    },
    {
      number: formatStat(likes),
      label: 'Likes Dados',
      Icon: Heart,
      gradient: 'from-pink-400 to-rose-500',
    },
  ];

  return (
    <section id="stats" aria-labelledby="stats-title" className="bg-app-bg text-app-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 id="stats-title" className="text-4xl md:text-5xl font-bold mb-6">
            Estadísticas en Tiempo Real
          </h2>
          <p className="text-xl opacity-80 max-w-2xl mx-auto">
            Nuestros números crecen cada día gracias a nuestra comunidad activa
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`text-center group hover:scale-105 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-r ${stat.gradient} flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300`}
              >
                <stat.Icon className="w-9 h-9 text-white" strokeWidth={2} />
              </div>
              <div className="text-4xl md:text-5xl font-bold mb-2 gradient-text group-hover:scale-110 transition-transform duration-300">
                {stat.number}
              </div>
              <div className="opacity-80 font-medium text-lg">{stat.label}</div>

              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm opacity-70">En vivo</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 p-8 rounded-2xl bg-app-form-bg border border-app-divider">
          <h3 className="text-xl font-semibold mb-4">¿Por qué estos números importan?</h3>
          <p className="opacity-80 max-w-3xl mx-auto leading-relaxed">
            Cada susurro representa un momento de reflexión personal, cada usuario es alguien que
            busca autoconocimiento, y cada like es una conexión significativa entre personas que
            comparten experiencias similares.
          </p>
        </div>
      </div>
    </section>
  );
}
