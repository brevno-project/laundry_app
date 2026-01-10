"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { useEffect, useState } from 'react';
import { KeyIcon, WashingIcon, CheckIcon, InfoIcon } from '@/components/Icons';

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
  
  // Состояние видимости badge
  const [showScrollHint, setShowScrollHint] = useState(true);
  
  // Находим текущую запись студента
  const myQueueItem = queue.find(
    item => item.student_id === user?.student_id &&
    [QueueStatus.KEY_ISSUED, QueueStatus.WASHING].includes(item.status as QueueStatus)
  );
  
  // Загружаем счетчики уведомлений из localStorage при смене queue_item
  useEffect(() => {
    if (!myQueueItem) return;
    
    const startKey = `notifications_start_${myQueueItem.id}`;
    const finishKey = `notifications_finish_${myQueueItem.id}`;
    
    const savedStart = localStorage.getItem(startKey);
    const savedFinish = localStorage.getItem(finishKey);
    
    if (savedStart) {
      setStartNotifications(JSON.parse(savedStart));
    } else {
      setStartNotifications({ count: 0, lastSent: null });
    }
    
    if (savedFinish) {
      setFinishNotifications(JSON.parse(savedFinish));
    } else {
      setFinishNotifications({ count: 0, lastSent: null });
    }
  }, [user,myQueueItem?.id]);
  
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
    
    try {
      // Получить JWT токен
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('❌ Нет авторизации');
        return;
      }
      
      // Отправляем Telegram уведомление админу
      const response = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: 'washing_started_by_student',
          full_name: myQueueItem.full_name,
          room: myQueueItem.room,
          student_id: myQueueItem.student_id,
          queue_item_id: myQueueItem.id
        })
      });

      if (response.ok) {
        const newState = { count: startNotifications.count + 1, lastSent: Date.now() };
        setStartNotifications(newState);
        // Сохраняем в localStorage
        if (myQueueItem) {
          localStorage.setItem(`notifications_start_${myQueueItem.id}`, JSON.stringify(newState));
        }
        const remaining = MAX_NOTIFICATIONS - newState.count;
        alert(`✅ Уведомление отправлено администратору!\nАдмин запустит таймер.\n\nОсталось уведомлений: ${remaining}`);
      } else {
        alert('❌ Ошибка отправки уведомления');
      }
    } catch (error) {
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
      // Получить JWT токен
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('❌ Нет авторизации');
        return;
      }
      
      // Отправляем Telegram уведомление админу
      const response = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: 'washing_finished',
          full_name: myQueueItem.full_name,
          room: myQueueItem.room,
          student_id: myQueueItem.student_id,
          queue_item_id: myQueueItem.id
        })
      });

      if (response.ok) {
        const newState = { count: finishNotifications.count + 1, lastSent: Date.now() };
        setFinishNotifications(newState);
        // Сохраняем в localStorage
        if (myQueueItem) {
          localStorage.setItem(`notifications_finish_${myQueueItem.id}`, JSON.stringify(newState));
        }
        const remaining = MAX_NOTIFICATIONS - newState.count;
        alert(`✅ Уведомление отправлено администратору!\nЗаберите вещи и ждите когда админ позовет вернуть ключ.\n\nОсталось уведомлений: ${remaining}`);
      } else {
        alert('❌ Ошибка отправки уведомления');
      }
    } catch (error) {
      alert('❌ Ошибка: ' + (error as Error).message);
    }
  };

  const scrollToButton = () => {
    const buttonElement = document.getElementById('student-action-button');
    if (buttonElement) {
      buttonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <>
      {/* Кнопка студента */}
      <div id="student-action-button" className="mb-6 w-full animate-slideDown">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 border-2 border-blue-400 animate-pulse-slow">
        {myQueueItem.status === QueueStatus.KEY_ISSUED && (
          <>
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <KeyIcon className="w-7 h-7 text-white flex-shrink-0" />
                <h3 className="text-2xl font-bold text-white">Ключ выдан!</h3>
              </div>
              <p className="text-blue-100">Идите к стиралке и нажмите кнопку когда начнете стирать</p>
              <div className="flex items-center justify-center gap-1 text-blue-200 text-sm mt-2">
                <InfoIcon className="w-4 h-4 flex-shrink-0" />
                <span>Админ получит уведомление и запустит таймер</span>
              </div>
            </div>
            <button
              onClick={handleStartWashing}
              className="w-full bg-white text-blue-700 font-bold py-4 px-6 rounded-xl text-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Начать стирку
            </button>
          </>
        )}

        {myQueueItem.status === QueueStatus.WASHING && (
          <>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-white mb-2">Стирка идет!</h3>
              {/* Таймер стирки */}
              <div className="bg-white/20 rounded-xl py-3 px-6 mb-3">
                <div className="text-blue-100 text-sm mb-1">Время стирки:</div>
                <div className="text-4xl font-black text-white">{washingTime}</div>
              </div>
              <p className="text-blue-100 text-sm">Нажмите кнопку когда закончите стирать</p>
              <div className="flex items-center justify-center gap-1 text-blue-200 text-sm mt-2">
                <InfoIcon className="w-4 h-4 flex-shrink-0" />
                <span>Админ получит уведомление</span>
              </div>
            </div>
            <button
              onClick={handleFinishWashing}
              className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-xl text-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="flex items-center justify-center gap-2">
                <CheckIcon className="w-5 h-5" />
                Закончить стирку
              </div>
            </button>
          </>
        )}
        </div>
      </div>
    </>
  );
}
