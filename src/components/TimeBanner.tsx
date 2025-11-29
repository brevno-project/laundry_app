"use client";

import { useState, useEffect } from 'react';
import { getLaundryTimeStatus, TimeStatus } from '@/lib/timeHelper';
import { EditIcon } from '@/components/Icons';

export default function TimeBanner() {
  const [timeStatus, setTimeStatus] = useState<TimeStatus>(getLaundryTimeStatus());

  // Обновлять каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStatus(getLaundryTimeStatus());
    }, 60000); // Каждую минуту

    return () => clearInterval(interval);
  }, []);

  // Не показывать если все нормально
  if (!timeStatus.message) return null;

  // Определяем стиль баннера
  const getBannerStyle = () => {
    switch (timeStatus.warningLevel) {
      case 'danger':
        return 'bg-red-600 border-red-700';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600';
      default:
        return 'bg-green-600 border-green-700';
    }
  };

  return (
    <div className={`${getBannerStyle()} border-2 p-4 rounded-lg shadow-lg mb-6`}>
      <div className="flex items-center justify-center">
        <p className="text-white font-bold text-lg text-center">
          {timeStatus.message}
        </p>
      </div>
      {timeStatus.isClosed && (
        <p className="text-white text-sm text-center mt-2 flex items-center justify-center gap-1">
          <EditIcon className="w-4 h-4" />Записаться в очередь можно в любое время
        </p>
      )}
    </div>
  );
}
