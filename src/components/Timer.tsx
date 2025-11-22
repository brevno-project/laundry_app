'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  startTime: string; // ISO timestamp
  label: string;
  color?: 'yellow' | 'blue' | 'green' | 'orange';
}

export default function Timer({ startTime, label, color = 'blue' }: TimerProps) {
  const [elapsed, setElapsed] = useState<string>('00:00:00');

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = now - start;

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

    // Обновляем каждую секунду
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    blue: 'bg-blue-100 text-blue-900 border-blue-300',
    green: 'bg-green-100 text-green-900 border-green-300',
    orange: 'bg-orange-100 text-orange-900 border-orange-300',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 ${colorClasses[color]}`}>
      <span className="text-xs font-semibold">{label}:</span>
      <span className="text-sm font-mono font-bold">⏱️ {elapsed}</span>
    </div>
  );
}
