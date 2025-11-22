"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { useEffect, useState } from 'react';

/**
 * Кнопки действий для студента
 * - "Начал стирать" когда KEY_ISSUED
 * - "Закончил стирать" когда WASHING
 */
// Лимит уведомлений
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 минут
const MAX_NOTIFICATIONS = 3;

interface NotificationState {
  count: number;
  lastSent: number | null;
}

export default function StudentActions() {
  const { user, queue } = useLaundry();

  // ✅ ВСЕ ХУКИ ДОЛЖНЫ БЫТЬ В НАЧАЛЕ, ДО ЛЮБЫХ УСЛОВИЙ!
  // Таймер стирки
  const [washingTime, setWashingTime] = useState<string>('0:00');
  
  // Состояние уведомлений
  const [startNotifications, setStartNotifications] = useState<NotificationState>({ count: 0, lastSent: null });
  const [finishNotifications, setFinishNotifications] = useState<NotificationState>({ count: 0, lastSent: null });
  
  // Находим текущую запись студента
  const myQueueItem = queue.find(
    item => item.student_id === user?.student_id &&
    [QueueStatus.KEY_ISSUED, QueueStatus.WASHING].includes(item.status as QueueStatus)
  );
  
  useEffect(() => {
    if (myQueueItem?.status === QueueStatus.WASHING && myQueueItem.washing_started_at) {
      const interval = setInterval(() => {
        const startTime = new Date(myQueueItem.washing_started_at!);
        const now = new Date();
        const elapsedMs = now.getTime() - startTime.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const elapsedSeconds = Math.floor((elapsedMs / 1000) % 60);
        
        setWashingTime(`${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [myQueueItem]);
  
  // Проверка можно ли отправить уведомление
  const canSendNotification = (state: NotificationState): { canSend: boolean; reason?: string } => {
    if (state.count >= MAX_NOTIFICATIONS) {
      return { canSend: false, reason: `Достигнут лимит уведомлений (${MAX_NOTIFICATIONS})` };
    }
    
    if (state.lastSent) {
      const timeSinceLastSent = Date.now() - state.lastSent;
      if (timeSinceLastSent < NOTIFICATION_COOLDOWN) {
        const remainingSeconds = Math.ceil((NOTIFICATION_COOLDOWN - timeSinceLastSent) / 1000);
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        return { 
          canSend: false, 
          reason: `Подождите ${remainingMinutes}:${seconds.toString().padStart(2, '0')}` 
        };
      }
    }
    
    return { canSend: true };
  };

  // Early returns ПОСЛЕ всех хуков
  if (!user) return null;
  if (!myQueueItem) return null;

  const handleStartWashing = async () => {
    const check = canSendNotification(startNotifications);
    if (!check.canSend) {
      alert('❌ ' + check.reason);
      return;
    }
    
    console.log('🟢 handleStartWashing: начало', { myQueueItem });
    try {
      // Отправляем Telegram уведомление админу
      const response = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'washing_started_by_student',
          full_name: myQueueItem.full_name,
          room: myQueueItem.room,
          student_id: myQueueItem.student_id,
          queue_item_id: myQueueItem.id
        })
      });

      if (response.ok) {
        setStartNotifications({ count: startNotifications.count + 1, lastSent: Date.now() });
        const remaining = MAX_NOTIFICATIONS - startNotifications.count - 1;
        alert(`✅ Уведомление отправлено администратору!\nАдмин запустит таймер.\n\nОсталось уведомлений: ${remaining}`);
      } else {
        alert('❌ Ошибка отправки уведомления');
      }
    } catch (error) {
      console.error('❌ Error в handleStartWashing:', error);
      alert('❌ Ошибка: ' + (error as Error).message);
    }
  };

  const handleFinishWashing = async () => {
    const check = canSendNotification(finishNotifications);
    if (!check.canSend) {
      alert('❌ ' + check.reason);
      return;
    }
    
    try {
      // Отправляем Telegram уведомление админу
      const response = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'washing_finished',
          full_name: myQueueItem.full_name,
          room: myQueueItem.room,
          student_id: myQueueItem.student_id,
          queue_item_id: myQueueItem.id
        })
      });

      if (response.ok) {
        setFinishNotifications({ count: finishNotifications.count + 1, lastSent: Date.now() });
        const remaining = MAX_NOTIFICATIONS - finishNotifications.count - 1;
        alert(`✅ Уведомление отправлено администратору!\nЗаберите вещи и ждите когда админ позовет вернуть ключ.\n\nОсталось уведомлений: ${remaining}`);
      } else {
        alert('❌ Ошибка отправки уведомления');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ Ошибка: ' + (error as Error).message);
    }
  };

  return (
    <div className="mb-6 w-full animate-slideDown">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 border-2 border-blue-400 animate-pulse-slow relative">
        {/* Стрелка вниз */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-blue-600 animate-bounce">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l3.293-3.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>
        {myQueueItem.status === QueueStatus.KEY_ISSUED && (
          <>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-white mb-2">🔑 Ключ выдан!</h3>
              <p className="text-blue-100">Идите к стиралке и нажмите кнопку когда начнете стирать</p>
              <p className="text-blue-200 text-sm mt-2">ℹ️ Админ получит уведомление и запустит таймер</p>
            </div>
            <button
              onClick={handleStartWashing}
              className="w-full bg-white text-blue-700 font-bold py-4 px-6 rounded-xl text-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🌀 Начал стирать
            </button>
          </>
        )}

        {myQueueItem.status === QueueStatus.WASHING && (
          <>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-white mb-2">🌀 Стирка идет!</h3>
              {/* Таймер стирки */}
              <div className="bg-white/20 rounded-xl py-3 px-6 mb-3">
                <div className="text-blue-100 text-sm mb-1">Время стирки:</div>
                <div className="text-4xl font-black text-white">{washingTime}</div>
              </div>
              <p className="text-blue-100 text-sm">Нажмите кнопку когда закончите стирать</p>
              <p className="text-blue-200 text-sm mt-2">ℹ️ Админ получит уведомление</p>
            </div>
            <button
              onClick={handleFinishWashing}
              className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-xl text-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ✅ Закончил стирать
            </button>
          </>
        )}
      </div>
    </div>
  );
}
