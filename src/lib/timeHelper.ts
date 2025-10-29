// Константы времени
export const LAUNDRY_OPEN_HOUR = 9;   // 09:00
export const LAUNDRY_CLOSE_HOUR = 22; // 22:00
export const WARNING_HOUR = 21;       // 21:00 - начало предупреждений

export interface TimeStatus {
  isOpen: boolean;              // Можно ли начать стирку
  isWarningTime: boolean;       // Время предупреждений (21:00-22:00)
  isClosed: boolean;            // Закрыто (22:00-09:00)
  minutesUntilClose: number;    // Минут до закрытия
  message: string;              // Сообщение для пользователя
  warningLevel: 'none' | 'warning' | 'danger'; // Уровень предупреждения
}

export function getLaundryTimeStatus(): TimeStatus {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Закрыто: с 22:00 до 09:00
  const isClosed = hour >= LAUNDRY_CLOSE_HOUR || hour < LAUNDRY_OPEN_HOUR;
  
  // Время предупреждений: с 21:00 до 22:00
  const isWarningTime = hour >= WARNING_HOUR && hour < LAUNDRY_CLOSE_HOUR;
  
  // Можно начать стирку: с 09:00 до 22:00
  const isOpen = !isClosed;
  
  // Считаем минуты до закрытия
  let minutesUntilClose = 0;
  if (isOpen) {
    const closeTime = new Date();
    closeTime.setHours(LAUNDRY_CLOSE_HOUR, 0, 0, 0);
    minutesUntilClose = Math.floor((closeTime.getTime() - now.getTime()) / 60000);
  }
  
  // Формируем сообщение
  let message = '';
  let warningLevel: 'none' | 'warning' | 'danger' = 'none';
  
  if (isClosed) {
    message = `⏰ Прачечная работает до ${LAUNDRY_CLOSE_HOUR}:00`;
    warningLevel = 'danger';
  } else if (isWarningTime) {
    const hours = Math.floor(minutesUntilClose / 60);
    const mins = minutesUntilClose % 60;
    message = `⚠️ До закрытия: ${hours > 0 ? `${hours}ч ` : ''}${mins}мин. Успейте забрать вещи до ${LAUNDRY_CLOSE_HOUR}:00!`;
    warningLevel = minutesUntilClose < 30 ? 'danger' : 'warning';
  }
  
  return {
    isOpen,
    isWarningTime,
    isClosed,
    minutesUntilClose,
    message,
    warningLevel
  };
}

export function formatTimeRemaining(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}ч ${mins}мин`;
  }
  return `${mins}мин`;
}
