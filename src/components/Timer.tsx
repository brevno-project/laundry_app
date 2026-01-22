'use client';

import { useState, useEffect } from 'react';
import { PauseIcon, TimerIcon } from '@/components/Icons';

interface TimerProps {
  startTime: string;
  endTime?: string;
  label: string;
  color?: 'yellow' | 'blue' | 'green' | 'orange';
  multiplier?: number;
}

// ✅ Временные зоны для разных типов таймеров (в минутах)
const TIME_ZONES = {
  yellow: { warning: 5, danger: 15 },   // Идет за ключом: 5-15 мин, >15 мин
  blue: { warning: 5, danger: 10 },     // Ключ выдан: 5-10 мин, >10 мин
  green: { warning: 80, danger: 120 },  // Стирает: 80-120 мин, >120 мин
  orange: { warning: 5, danger: 10 },   // Возвращает ключ: 5-10 мин, >10 мин
};

export default function Timer({ startTime, endTime, label, color = 'blue', multiplier = 1 }: TimerProps) {
  const [time, setTime] = useState('00:00:00');
  const [timeZone, setTimeZone] = useState<'normal' | 'warning' | 'danger'>('normal');

  useEffect(() => {
    const update = () => {
      const start = new Date(startTime).getTime();
      const end = endTime ? new Date(endTime).getTime() : Date.now();
      const ms = Math.max(0, end - start);
      
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      
      setTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      
      // ✅ Определяем временную зону в зависимости от типа таймера
      const minutes = Math.floor(ms / 60000);
      const zones = TIME_ZONES[color];
      const scale = color === 'green' ? Math.max(1, multiplier) : 1;
      const warning = zones.warning * scale;
      const danger = zones.danger * scale;

      if (minutes >= danger) {
        setTimeZone('danger'); // 
      } else if (minutes >= warning) {
        setTimeZone('warning'); // 
      } else {
        setTimeZone('normal'); // 
      }
    };

    update();
    
    if (endTime) return;
    
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime, endTime, color, multiplier]);

  // ✅ Базовые цвета таймеров
  const baseColors = {
    yellow: { bg: 'bg-amber-50 dark:bg-amber-950/25', text: 'text-amber-900 dark:text-amber-200', border: 'border-amber-300 dark:border-amber-500/40' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-900 dark:text-blue-200', border: 'border-blue-300 dark:border-blue-500/50' },
    green: { bg: 'bg-emerald-50 dark:bg-slate-700', text: 'text-emerald-900 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-500/50' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/25', text: 'text-orange-900 dark:text-orange-200', border: 'border-orange-300 dark:border-orange-500/40' },
  };

  const currentColor = baseColors[color];

  // ✅ Модификаторы для временных зон
  let zoneModifier = '';
  let bgColor = currentColor.bg;
  let textColor = currentColor.text;
  let borderColor = currentColor.border;
  
  if (timeZone === 'warning') {
    // Желтая зона: более интенсивный желтый фон + мигание
    bgColor = 'bg-yellow-200 dark:bg-amber-900/30';
    textColor = 'text-yellow-900 dark:text-amber-200';
    borderColor = 'border-yellow-500 dark:border-amber-500/50';
    zoneModifier = 'animate-pulse';
  } else if (timeZone === 'danger') {
    // Красная зона: более интенсивный красный цвет + пульсация
    bgColor = 'bg-red-200 dark:bg-rose-900/30';
    textColor = 'text-red-900 dark:text-rose-200';
    borderColor = 'border-red-600 dark:border-rose-500/50';
    zoneModifier = 'animate-pulse';
  }

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg border-2 shadow-md ${bgColor} ${textColor} ${borderColor} ${zoneModifier} ${endTime ? 'opacity-80' : ''} w-full`}>
      <div className="flex items-center gap-2">
        {endTime ? <PauseIcon className="w-4 h-4" /> : <TimerIcon className="w-4 h-4" />}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <span className="text-sm font-mono font-bold">{time}</span>
    </div>
  );
}
