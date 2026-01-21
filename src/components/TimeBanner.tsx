"use client";

import { useState, useEffect } from 'react';
import { getLaundryTimeStatus, LAUNDRY_CLOSE_HOUR, TimeStatus } from '@/lib/timeHelper';
import { EditIcon, ClockIcon, WarningIcon } from '@/components/Icons';
import { UiLanguage, useUi } from '@/contexts/UiContext';

const formatRemaining = (minutes: number, language: UiLanguage) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (language === 'en') {
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  }
  if (language === 'ko') {
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  }
  if (language === 'ky') {
    return hours > 0 ? `${hours} саат ${mins} мүн` : `${mins} мүн`;
  }
  return hours > 0 ? `${hours} ч ${mins} мин` : `${mins} мин`;
};

export default function TimeBanner() {
  const { t, language } = useUi();
  const [timeStatus, setTimeStatus] = useState<TimeStatus>(getLaundryTimeStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStatus(getLaundryTimeStatus());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (timeStatus.warningLevel === 'none') return null;

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

  const Icon = timeStatus.isClosed ? ClockIcon : WarningIcon;
  const message = timeStatus.isClosed
    ? t('time.closed', { closeHour: LAUNDRY_CLOSE_HOUR })
    : t('time.warning', {
        time: formatRemaining(timeStatus.minutesUntilClose, language),
        closeHour: LAUNDRY_CLOSE_HOUR,
      });

  return (
    <div className={`${getBannerStyle()} border-2 p-4 rounded-lg shadow-lg mb-6`}>
      <div className="flex items-center justify-center gap-2">
        <Icon className="w-6 h-6 text-white" />
        <p className="text-white font-bold text-lg text-center">{message}</p>
      </div>
      {timeStatus.isClosed && (
        <p className="text-white text-sm text-center mt-2 flex items-center justify-center gap-1">
          <EditIcon className="w-4 h-4" />
          {t('time.closedHint')}
        </p>
      )}
    </div>
  );
}
