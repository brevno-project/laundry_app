export const LAUNDRY_OPEN_HOUR = 9; // Начало времени, когда можно стирать
export const LAUNDRY_CLOSE_HOUR = 22; // Конец времени, когда можно стирать
export const WARNING_HOUR = 21;

export interface TimeStatus {
  isOpen: boolean;
  isWarningTime: boolean;
  isClosed: boolean;
  minutesUntilClose: number;
  warningLevel: 'none' | 'warning' | 'danger';
}

export function getLaundryTimeStatus(): TimeStatus {
  const now = new Date();
  const hour = now.getHours();

  // Запись в очередь круглосуточно, но стирка запрещена ночью
  const isWashingClosed = hour >= LAUNDRY_CLOSE_HOUR || hour < LAUNDRY_OPEN_HOUR;
  const isQueueOpen = true; // Круглосуточно
  const isWarningTime = hour >= WARNING_HOUR && hour < LAUNDRY_CLOSE_HOUR; // Предупреждение за час до закрытия стирки

  let minutesUntilClose = 0;
  if (!isWashingClosed) {
    const closeTime = new Date();
    closeTime.setHours(LAUNDRY_CLOSE_HOUR, 0, 0, 0);
    // Если время закрытия уже сегодня прошло, считаем до завтрашнего
    if (closeTime.getTime() <= now.getTime()) {
      closeTime.setDate(closeTime.getDate() + 1);
    }
    minutesUntilClose = Math.max(0, Math.floor((closeTime.getTime() - now.getTime()) / 60000));
  }

  let warningLevel: 'none' | 'warning' | 'danger' = 'none';
  if (isWashingClosed) {
    warningLevel = 'danger';
  } else if (isWarningTime) {
    warningLevel = minutesUntilClose < 30 ? 'danger' : 'warning';
  }

  return {
    isOpen: isQueueOpen,
    isWarningTime,
    isClosed: isWashingClosed,
    minutesUntilClose,
    warningLevel,
  };
}
