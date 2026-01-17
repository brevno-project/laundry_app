'use client';

import { useState, useEffect } from 'react';
import { PauseIcon, TimerIcon, WarningIcon } from '@/components/Icons';

interface TimerProps {
  startTime: string;
  endTime?: string;
  label: string;
  color?: 'yellow' | 'blue' | 'green' | 'orange';
}

export default function Timer({ startTime, endTime, label, color = 'blue' }: TimerProps) {
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
      
      // ✅ Определяем временную зону
      const minutes = Math.floor(ms / 60000);
      if (minutes >= 15) {
        setTimeZone('danger'); // Красная зона
      } else if (minutes >= 5) {
        setTimeZone('warning'); // Желтая зона
      } else {
        setTimeZone('normal'); // Нормально
      }
    };

    update();
    
    if (endTime) return;
    
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime, endTime]);

  // ✅ Базовые цвета таймеров
  const baseColors = {
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-400' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-400' },
    green: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-400' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-400' },
  };

  // ✅ Модификаторы для временных зон
  let zoneModifier = '';
  let showWarning = false;
  
  if (timeZone === 'warning' && !endTime) {
    // Желтая зона: легкое мигание
    zoneModifier = 'animate-pulse';
  } else if (timeZone === 'danger' && !endTime) {
    // Красная зона: яркое мигание + иконка
    zoneModifier = 'animate-pulse bg-opacity-90';
    showWarning = true;
  }

  const currentColor = baseColors[color];

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg border-2 shadow-md ${currentColor.bg} ${currentColor.text} ${currentColor.border} ${zoneModifier} ${endTime ? 'opacity-80' : ''} w-full`}>
      <div className="flex items-center gap-2">
        {endTime ? <PauseIcon className="w-4 h-4" /> : <TimerIcon className="w-4 h-4" />}
        <span className="text-xs font-semibold">{label}</span>
        {showWarning && <WarningIcon className="w-4 h-4 text-red-600 animate-bounce" />}
      </div>
      <span className="text-sm font-mono font-bold">{time}</span>
    </div>
  );
}
