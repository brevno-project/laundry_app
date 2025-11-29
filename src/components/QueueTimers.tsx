"use client";

import { useEffect, useState } from 'react';
import { QueueItem, QueueStatus } from '@/types';
import { KeyIcon, WashingIcon, HourglassIcon } from '@/components/Icons';

interface QueueTimersProps {
  item: QueueItem;
}

/**
 * Компонент таймера с цветовой индикацией для каждого этапа очереди
 * 
 * Зоны:
 * - READY (позвать за ключом): 15 мин красная
 * - KEY_ISSUED (выдан ключ до стирки): 5 мин красная
 * - WASHING (стирка): 80 мин желтая, 120 мин красная
 * - RETURNING_KEY (принести ключ): 5 мин красная
 */
export default function QueueTimers({ item }: QueueTimersProps) {
  const [elapsed, setElapsed] = useState(0);
  const [color, setColor] = useState('green');

  useEffect(() => {
    const interval = setInterval(() => {
      let startTime: Date | null = null;
      let redZoneMinutes = 15;
      let yellowZoneMinutes = 0; // Желтая зона (только для стирки)

      // Определяем время начала и зоны в зависимости от статуса
      switch (item.status) {
        case QueueStatus.READY:
          startTime = item.ready_at ? new Date(item.ready_at) : null;
          redZoneMinutes = 15; // 15 минут красная зона
          break;
        case QueueStatus.KEY_ISSUED:
          startTime = item.key_issued_at ? new Date(item.key_issued_at) : null;
          redZoneMinutes = 5; // 5 минут красная зона
          break;
        case QueueStatus.WASHING:
          startTime = item.washing_started_at ? new Date(item.washing_started_at) : null;
          yellowZoneMinutes = (item.wash_count || 1) * 80; // 80 минут на стирку - желтая
          redZoneMinutes = (item.wash_count || 1) * 120; // 120 минут - красная
          break;
        case QueueStatus.WASHING_FINISHED:
          startTime = item.washing_finished_at ? new Date(item.washing_finished_at) : null;
          redZoneMinutes = 5; // 5 минут красная зона
          break;
        case QueueStatus.RETURNING_KEY:
          startTime = item.return_requested_at ? new Date(item.return_requested_at) : null;
          redZoneMinutes = 5; // 5 минут красная зона
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
      if (elapsedMinutes >= redZoneMinutes) {
        setColor('red');
      } else if (yellowZoneMinutes > 0 && elapsedMinutes >= yellowZoneMinutes) {
        setColor('yellow'); // Желтая зона (только для стирки)
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

  // Определяем текст статуса и иконку
  const getStatusInfo = (): { text: string; Icon: React.ComponentType<{ className?: string }> } => {
    switch (item.status) {
      case QueueStatus.READY:
        return { text: 'Ожидание ключа', Icon: HourglassIcon };
      case QueueStatus.KEY_ISSUED:
        return { text: 'Ключ выдан', Icon: KeyIcon };
      case QueueStatus.WASHING:
        return { text: 'Стирка', Icon: WashingIcon };
      case QueueStatus.WASHING_FINISHED:
        return { text: 'Стирка завершена', Icon: WashingIcon };
      case QueueStatus.RETURNING_KEY:
        return { text: 'Возврат ключа', Icon: KeyIcon };
      default:
        return { text: '', Icon: HourglassIcon };
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

  const { text, Icon } = getStatusInfo();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 shadow-sm ${colorClasses[color as keyof typeof colorClasses]} font-semibold text-sm`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-xs">{text}:</span>
      <span className="font-bold">{formatTime(elapsed)}</span>
    </div>
  );
}
