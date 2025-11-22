'use client';

import { useState, useEffect } from 'react';

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
    yellow: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    blue: 'bg-blue-100 text-blue-900 border-blue-300',
    green: 'bg-green-100 text-green-900 border-green-300',
    orange: 'bg-orange-100 text-orange-900 border-orange-300',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 ${colorClasses[color]} ${isStopped ? 'opacity-75' : ''}`}>
      <span className="text-xs font-semibold">{label}:</span>
      <span className="text-sm font-mono font-bold">{isStopped ? '⏸️' : '⏱️'} {elapsed}</span>
    </div>
  );
}
