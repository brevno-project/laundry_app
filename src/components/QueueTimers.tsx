"use client";

import { useEffect, useState } from 'react';
import { QueueItem, QueueStatus } from '@/types';

interface QueueTimersProps {
  item: QueueItem;
}

// Режим тестирования: ускоряет время в 60 раз
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === 'true';
const TIME_MULTIPLIER = TEST_MODE ? 60 : 1;

/**
 * Компонент таймера с цветовой индикацией для каждого этапа очереди
 * 
 * Красные зоны:
 * - READY (позвать за ключом): 30 минут
 * - KEY_ISSUED (выдан ключ): 30 минут
 * - WASHING (стирка): wash_count × 80 минут
 * - RETURNING_KEY (возврат ключа): 30 минут
 */
export default function QueueTimers({ item }: QueueTimersProps) {
  const [elapsed, setElapsed] = useState(0);
  const [color, setColor] = useState('green');

  useEffect(() => {
    const interval = setInterval(() => {
      let startTime: Date | null = null;
      let redZoneMinutes = 30; // По умолчанию 30 минут

      // Определяем время начала и красную зону в зависимости от статуса
      switch (item.status) {
        case QueueStatus.READY:
          startTime = item.ready_at ? new Date(item.ready_at) : null;
          redZoneMinutes = 30;
          break;
        case QueueStatus.KEY_ISSUED:
          startTime = item.key_issued_at ? new Date(item.key_issued_at) : null;
          redZoneMinutes = 30;
          break;
        case QueueStatus.WASHING:
          startTime = item.washing_started_at ? new Date(item.washing_started_at) : null;
          redZoneMinutes = (item.wash_count || 1) * 80; // 80 минут на стирку
          break;
        case QueueStatus.RETURNING_KEY:
          startTime = item.washing_finished_at ? new Date(item.washing_finished_at) : null;
          redZoneMinutes = 30;
          break;
        default:
          return;
      }

      if (!startTime) return;

      const now = new Date();
      const elapsedMs = now.getTime() - startTime.getTime();
      const elapsedMinutes = elapsedMs / 60000 / TIME_MULTIPLIER;

      setElapsed(elapsedMinutes);

      // Цветовая индикация
      const yellowZone = redZoneMinutes * 0.6; // 60% от красной зоны
      
      if (elapsedMinutes >= redZoneMinutes) {
        setColor('red');
      } else if (elapsedMinutes >= yellowZone) {
        setColor('yellow');
      } else {
        setColor('green');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [item]);

  // Форматирование времени
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
  };

  // Определяем текст статуса
  const getStatusText = (): string => {
    switch (item.status) {
      case QueueStatus.READY:
        return 'Ожидание ключа';
      case QueueStatus.KEY_ISSUED:
        return 'Ключ выдан';
      case QueueStatus.WASHING:
        return 'Стирка';
      case QueueStatus.RETURNING_KEY:
        return 'Возврат ключа';
      default:
        return '';
    }
  };

  // Цвета для индикации
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300 animate-pulse'
  };

  if (![QueueStatus.READY, QueueStatus.KEY_ISSUED, QueueStatus.WASHING, QueueStatus.RETURNING_KEY].includes(item.status as QueueStatus)) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 ${colorClasses[color as keyof typeof colorClasses]} font-semibold text-sm`}>
      <span className="text-xs">{getStatusText()}:</span>
      <span className="font-bold">{formatTime(elapsed)}</span>
      {TEST_MODE && <span className="text-xs opacity-50">(TEST)</span>}
    </div>
  );
}
