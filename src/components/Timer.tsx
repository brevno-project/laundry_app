'use client';

import { useState, useEffect } from 'react';
import { PauseIcon, TimerIcon } from '@/components/Icons';

interface TimerProps {
  startTime: string;
  endTime?: string;
  label: string;
  color?: 'yellow' | 'blue' | 'green' | 'orange';
}

export default function Timer({ startTime, endTime, label, color = 'blue' }: TimerProps) {
  const [time, setTime] = useState('00:00:00');
  const [displayColor, setDisplayColor] = useState(color);

  useEffect(() => {
    const update = () => {
      const start = new Date(startTime).getTime();
      const end = endTime ? new Date(endTime).getTime() : Date.now();
      const ms = Math.max(0, end - start);
      
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      
      setTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      
      // ✅ Автоматическое изменение цвета в зависимости от времени
      if (!endTime) {
        // Для активных таймеров (без endTime)
        const minutes = Math.floor(ms / 60000);
        
        if (minutes >= 15) {
          // Красная зона: > 15 мин
          setDisplayColor('orange');
        } else if (minutes >= 5) {
          // Желтая зона: 5-15 мин
          setDisplayColor('yellow');
        } else {
          // Зеленая зона: < 5 мин
          setDisplayColor('green');
        }
      } else {
        // Для завершенных таймеров (с endTime)
        const minutes = Math.floor(ms / 60000);
        
        if (minutes >= 15) {
          // Красная зона: > 15 мин
          setDisplayColor('orange');
        } else if (minutes >= 5) {
          // Желтая зона: 5-15 мин
          setDisplayColor('yellow');
        } else {
          // Зеленая зона: < 5 мин
          setDisplayColor('green');
        }
      }
    };

    update();
    
    if (endTime) return;
    
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime, endTime]);

  const colors = {
    yellow: 'bg-yellow-50 text-yellow-900 border-yellow-400 shadow-yellow-200 animate-pulse',
    blue: 'bg-blue-50 text-blue-900 border-blue-400 shadow-blue-200',
    green: 'bg-green-50 text-green-900 border-green-400 shadow-green-200',
    orange: 'bg-orange-50 text-orange-900 border-orange-400 shadow-orange-200 animate-pulse',
  };

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg border-2 shadow-md ${colors[displayColor]} ${endTime ? 'opacity-80' : ''} w-full`}>
      <div className="flex items-center gap-2">
        {endTime ? <PauseIcon className="w-4 h-4" /> : <TimerIcon className="w-4 h-4" />}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <span className="text-sm font-mono font-bold">{time}</span>
    </div>
  );
}
