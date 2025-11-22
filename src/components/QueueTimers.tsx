"use client";

import { useEffect, useState } from 'react';
import { QueueItem, QueueStatus } from '@/types';

interface QueueTimersProps {
  item: QueueItem;
}

// 🔴 ВРЕМЕННО: Красные зоны ускорены для тестирования
// 30 минут → 30 секунд (0.5 минуты)
// 80 минут → 80 секунд (1.33 минуты)
// ЧТОБЫ ВЕРНУТЬ: умножьте все redZoneMinutes на 60
const SPEED_MULTIPLIER = 60; // Ускорение времени

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
          redZoneMinutes = 30 / SPEED_MULTIPLIER; // 30 секунд (было 30 минут)
          break;
        case QueueStatus.KEY_ISSUED:
          startTime = item.key_issued_at ? new Date(item.key_issued_at) : null;
          redZoneMinutes = 30 / SPEED_MULTIPLIER; // 30 секунд (было 30 минут)
          break;
        case QueueStatus.WASHING:
          startTime = item.washing_started_at ? new Date(item.washing_started_at) : null;
          redZoneMinutes = ((item.wash_count || 1) * 80) / SPEED_MULTIPLIER; // 80 секунд на стирку (было 80 минут)
          break;
        case QueueStatus.WASHING_FINISHED:
          startTime = item.washing_finished_at ? new Date(item.washing_finished_at) : null;
          redZoneMinutes = 30 / SPEED_MULTIPLIER; // 30 секунд (было 30 минут)
          break;
        case QueueStatus.RETURNING_KEY:
          startTime = item.return_requested_at ? new Date(item.return_requested_at) : null;
          redZoneMinutes = 5 / SPEED_MULTIPLIER; // 5 секунд (было 5 минут)
          break;
        default:
          return;
      }

      if (!startTime) return;

      const now = new Date();
      const elapsedMs = now.getTime() - startTime.getTime();
      const elapsedMinutes = elapsedMs / 60000;

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
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      case QueueStatus.WASHING_FINISHED:
        return 'Стирка завершена';
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

  if (![QueueStatus.READY, QueueStatus.KEY_ISSUED, QueueStatus.WASHING, QueueStatus.WASHING_FINISHED, QueueStatus.RETURNING_KEY].includes(item.status as QueueStatus)) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 ${colorClasses[color as keyof typeof colorClasses]} font-semibold text-sm`}>
      <span className="text-xs">{getStatusText()}:</span>
      <span className="font-bold">{formatTime(elapsed)}</span>
    </div>
  );
}
