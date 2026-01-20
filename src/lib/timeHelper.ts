export const LAUNDRY_OPEN_HOUR = 9;
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

  const isClosed = hour >= LAUNDRY_CLOSE_HOUR || hour < LAUNDRY_OPEN_HOUR;
  const isWarningTime = hour >= WARNING_HOUR && hour < LAUNDRY_CLOSE_HOUR;
  const isOpen = !isClosed;

  let minutesUntilClose = 0;
  if (isOpen) {
    const closeTime = new Date();
    closeTime.setHours(LAUNDRY_CLOSE_HOUR, 0, 0, 0);
    minutesUntilClose = Math.max(0, Math.floor((closeTime.getTime() - now.getTime()) / 60000));
  }

  let warningLevel: 'none' | 'warning' | 'danger' = 'none';
  if (isClosed) {
    warningLevel = 'danger';
  } else if (isWarningTime) {
    warningLevel = minutesUntilClose < 30 ? 'danger' : 'warning';
  }

  return {
    isOpen,
    isWarningTime,
    isClosed,
    minutesUntilClose,
    warningLevel,
  };
}
