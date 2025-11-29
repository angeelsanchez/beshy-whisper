'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useStats } from '@/hooks/useStats';

export default function LiveStats() {
  const { colors } = useTheme();
  const { totalEntries, totalUsers, totalLikes, satisfactionRate, loading } = useStats();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatStat = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M+`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K+`;
    } else if (value >= 100) {
      return `${value}+`;
    } else {
      return `${value}+`;
    }
  };

  const stats = [
    { 
      number: loading ? "..." : formatStat(totalEntries), 
      label: "Susurros Creados", 
      icon: "📝",
      color: "from-amber-400 to-orange-500"
    },
    { 
      number: loading ? "..." : formatStat(totalUsers), 
      label: "Usuarios Activos", 
      icon: "👥",
      color: "from-blue-400 to-purple-500"
    },
    { 
      number: loading ? "..." : formatStat(totalLikes), 
      label: "Likes Dados", 
      icon: "❤️",
      color: "from-pink-400 to-rose-500"
    },
    { 
      number: loading ? "..." : `${satisfactionRate}%`, 
      label: "Satisfacción", 
      icon: "⭐",
      color: "from-green-400 to-teal-500"
    }
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 animate-pulse"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mx-auto animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Estadísticas en Tiempo Real
        </h2>
        <p className="text-xl opacity-80 max-w-2xl mx-auto">
          Nuestros números crecen cada día gracias a nuestra comunidad activa
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={`text-center group hover:scale-105 transition-all duration-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center text-4xl mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300`}>
              {stat.icon}
            </div>
            <div className="text-4xl md:text-5xl font-bold mb-2 gradient-text group-hover:scale-110 transition-transform duration-300">
              {stat.number}
            </div>
            <div className="opacity-80 font-medium text-lg">{stat.label}</div>
            
            {/* Live indicator */}
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm opacity-70">En vivo</span>
            </div>
          </div>
        ))}
      </div>

      {/* Additional context */}
      <div className="text-center mt-12 p-8 rounded-2xl" style={{ backgroundColor: colors.formBg }}>
        <h3 className="text-xl font-semibold mb-4">
          ¿Por qué estos números importan?
        </h3>
        <p className="opacity-80 max-w-3xl mx-auto leading-relaxed">
          Cada susurro representa un momento de reflexión personal, cada usuario es alguien que busca autoconocimiento, 
          y cada like es una conexión significativa entre personas que comparten experiencias similares. 
          Juntos estamos construyendo una comunidad de bienestar y crecimiento personal.
        </p>
      </div>
    </div>
  );
} 