"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import FullScreenAlert from './FullScreenAlert';
import { QueueStatus } from '@/types';

/**
 * Глобальный компонент для показа баннеров ВСЕМ студентам в очереди
 * Работает даже если студент не вошел в систему
 */
export default function GlobalAlert() {
  const { user, queue } = useLaundry();
  
  // Если пользователь не вошел, не показываем баннер
  // (баннер показывается только вошедшим пользователям)
  if (!user) return null;
  
  // Ищем запись пользователя в очереди
  const userQueueItem = queue.find(item => 
    item.student_id === user.student_id && 
    [QueueStatus.WAITING, QueueStatus.READY, QueueStatus.KEY_ISSUED, QueueStatus.WASHING, QueueStatus.RETURNING_KEY].includes(item.status)
  );
  
  if (!userQueueItem) return null;
  
  // Получаем комнату админа
  const adminRoom = userQueueItem.admin_room || 'A501';
  
  // Приоритет 1: "Принеси ключ"
  if (userQueueItem.return_key_alert || userQueueItem.status === QueueStatus.RETURNING_KEY) {
    return (
      <FullScreenAlert 
        status={userQueueItem.status} 
        needsToReturnKey={true}
        adminRoom={adminRoom}
      />
    );
  }
  
  // Приоритет 2: "Вас зовут"
  if (userQueueItem.status === QueueStatus.READY) {
    return <FullScreenAlert status={userQueueItem.status} adminRoom={adminRoom} />;
  }
  
  return null;
}
