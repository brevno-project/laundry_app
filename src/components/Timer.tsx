'use client';

import { useState, useEffect } from 'react';
import { PauseIcon, TimerIcon } from '@/components/Icons';

interface TimerProps {
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp - если указан, таймер остановлен
  label: string;
  color?: 'yellow' | 'blue' | 'green' | 'orange';
}

export default function Timer({ startTime, endTime, label, color = 'blue' }: TimerProps) {
  const [elapsed, setElapsed] = useState<string>('00:00:00');
  const [isStopped, setIsStopped] = useState<boolean>(!!endTime);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const end = endTime ? new Date(endTime).getTime() : Date.now();
      const diff = end - start;

      if (diff < 0) {
        setElapsed('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setElapsed(formatted);
    };

    // Обновляем сразу
    calculateElapsed();

    // Если таймер остановлен, не обновляем
    if (endTime) {
      setIsStopped(true);
      return;
    }

    // Обновляем каждую секунду
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const colorClasses = {
    yellow: 'bg-yellow-50 text-yellow-900 border-yellow-400 shadow-yellow-200',
    blue: 'bg-blue-50 text-blue-900 border-blue-400 shadow-blue-200',
    green: 'bg-green-50 text-green-900 border-green-400 shadow-green-200',
    orange: 'bg-orange-50 text-orange-900 border-orange-400 shadow-orange-200',
  };

  const Icon = isStopped ? PauseIcon : TimerIcon;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 shadow-md ${colorClasses[color]} ${isStopped ? 'opacity-80' : 'animate-pulse-slow'}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-xs font-semibold flex-shrink-0">{label}</span>
      <span className="text-base font-mono font-bold">{elapsed}</span>
    </div>
  );
}
