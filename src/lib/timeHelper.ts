export const LAUNDRY_OPEN_HOUR = 15; // Информативно: до этого времени стирка недоступна
export const LAUNDRY_OPEN_MINUTE = 30;
export const LAUNDRY_CLOSE_HOUR = 22;
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
  const openTime = new Date();
  openTime.setHours(LAUNDRY_OPEN_HOUR, LAUNDRY_OPEN_MINUTE, 0, 0);

  // Информативный статус: считаем "закрыто", если сейчас раньше времени открытия
  const isWashingClosed = now.getTime() < openTime.getTime();

  const minutesUntilClose = 0;
  const isWarningTime = false;
  const warningLevel: 'none' | 'warning' | 'danger' = isWashingClosed ? 'danger' : 'none';

  const isQueueOpen = true;

  return {
    isOpen: isQueueOpen,
    isWarningTime,
    isClosed: isWashingClosed,
    minutesUntilClose,
    warningLevel,
  };
}
