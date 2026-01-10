"use client";

import { useEffect, useState } from 'react';
import { QueueItem, QueueStatus } from '@/types';
import { KeyIcon, WashingIcon, HourglassIcon } from '@/components/Icons';

interface QueueTimersProps {
  item: QueueItem;
}

export default function QueueTimers({ item }: QueueTimersProps) {
  const [time, setTime] = useState('0:00');
  const [color, setColor] = useState('green');

  useEffect(() => {
    let startTime: string | null = null;
    let yellowMin = 0;
    let redMin = 15;

    if (item.status === QueueStatus.READY) {
      startTime = item.ready_at;
      yellowMin = 5;
      redMin = 15;
    } else if (item.status === QueueStatus.KEY_ISSUED) {
      startTime = item.key_issued_at;
      yellowMin = 5;
      redMin = 15;
    } else if (item.status === QueueStatus.WASHING) {
      startTime = item.washing_started_at;
      yellowMin = (item.wash_count || 1) * 80;
      redMin = (item.wash_count || 1) * 120;
    } else if (item.status === QueueStatus.WASHING_FINISHED) {
      startTime = item.washing_finished_at;
      yellowMin = 5;
      redMin = 15;
    } else if (item.status === QueueStatus.RETURNING_KEY) {
      startTime = item.return_requested_at;
      yellowMin = 5;
      redMin = 15;
    } else {
      return;
    }

    if (!startTime) return;

    const update = () => {
      const ms = Date.now() - new Date(startTime!).getTime();
      const min = ms / 60000;
      
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      
      setTime(h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`);
      setColor(min >= redMin ? 'red' : min >= yellowMin && yellowMin > 0 ? 'yellow' : 'green');
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [item.status, item.ready_at, item.key_issued_at, item.washing_started_at, item.washing_finished_at, item.return_requested_at, item.wash_count]);

  const icons = {
    [QueueStatus.READY]: { text: 'Ожидание ключа', Icon: HourglassIcon },
    [QueueStatus.KEY_ISSUED]: { text: 'Ключ выдан', Icon: KeyIcon },
    [QueueStatus.WASHING]: { text: 'Стирка', Icon: WashingIcon },
    [QueueStatus.WASHING_FINISHED]: { text: 'Стирка завершена', Icon: WashingIcon },
    [QueueStatus.RETURNING_KEY]: { text: 'Возврат ключа', Icon: KeyIcon },
  };

  const colors = {
    green: 'bg-green-50 text-green-900 border-green-400 shadow-green-200',
    yellow: 'bg-yellow-50 text-yellow-900 border-yellow-400 shadow-yellow-200',
    red: 'bg-red-50 text-red-900 border-red-400 shadow-red-200 animate-pulse'
  };

  const info = icons[item.status as keyof typeof icons];
  if (!info) return null;

  const { text, Icon } = info;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 shadow-md ${colors[color as keyof typeof colors]} font-semibold w-full`}>
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{text}</span>
      </div>
      <span className="text-lg font-bold font-mono">{time}</span>
    </div>
  );
}
