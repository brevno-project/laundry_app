export const LAUNDRY_OPEN_HOUR = 9;
export const LAUNDRY_OPEN_MINUTE = 0;
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
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isClosedNow = hour >= LAUNDRY_CLOSE_HOUR || hour < LAUNDRY_OPEN_HOUR || (hour === LAUNDRY_OPEN_HOUR && minute < LAUNDRY_OPEN_MINUTE);

  const minutesUntilClose = 0;
  const isWarningTime = false;
  const warningLevel: 'none' | 'warning' | 'danger' = isClosedNow ? 'danger' : 'none';

  const isQueueOpen = true;

  return {
    isOpen: isQueueOpen,
    isWarningTime,
    isClosed: isClosedNow,
    minutesUntilClose,
    warningLevel,
  };
}
