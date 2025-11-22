"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { useEffect, useState } from 'react';

// Режим тестирования
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === 'true';
const TIME_MULTIPLIER = TEST_MODE ? 60 : 1;

/**
 * Кнопки действий для студента
 * - "Начал стирать" когда KEY_ISSUED
 * - "Закончил стирать" когда WASHING
 */
export default function StudentActions() {
  const { user, queue, setQueueStatus, updateQueueItem } = useLaundry();

  if (!user) return null;

  // Находим текущую запись студента
  const myQueueItem = queue.find(
    item => item.student_id === user.student_id &&
    [QueueStatus.KEY_ISSUED, QueueStatus.WASHING].includes(item.status as QueueStatus)
  );

  if (!myQueueItem) return null;

  const handleStartWashing = async () => {
    try {
      // Сохраняем время начала стирки
      await updateQueueItem(myQueueItem.id, {
        washing_started_at: new Date().toISOString()
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      await setQueueStatus(myQueueItem.id, QueueStatus.WASHING);

      // Отправляем Telegram уведомление
      try {
        await fetch('/api/telegram/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'washing_started_by_student',
            full_name: myQueueItem.full_name,
            room: myQueueItem.room,
            student_id: myQueueItem.student_id
          })
        });
      } catch (err) {
        console.error('❌ Error sending Telegram notification:', err);
      }

      alert('✅ Стирка началась! Таймер запущен.');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ Ошибка при начале стирки');
    }
  };

  const handleFinishWashing = async () => {
    try {
      // Сохраняем время окончания стирки
      await updateQueueItem(myQueueItem.id, {
        washing_finished_at: new Date().toISOString()
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      // Переводим в WASHING_FINISHED - студент закончил, ждет админа
      await setQueueStatus(myQueueItem.id, QueueStatus.WASHING_FINISHED);

      // Отправляем Telegram уведомление
      try {
        await fetch('/api/telegram/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'washing_finished',
            full_name: myQueueItem.full_name,
            room: myQueueItem.room,
            student_id: myQueueItem.student_id
          })
        });
      } catch (err) {
        console.error('❌ Error sending Telegram notification:', err);
      }

      alert('✅ Стирка завершена! Администратор получил уведомление.');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ Ошибка при завершении стирки');
    }
  };

  // Таймер стирки
  const [washingTime, setWashingTime] = useState<string>('0:00');
  
  useEffect(() => {
    if (myQueueItem?.status === QueueStatus.WASHING && myQueueItem.washing_started_at) {
      const interval = setInterval(() => {
        const startTime = new Date(myQueueItem.washing_started_at!);
        const now = new Date();
        const elapsedMs = now.getTime() - startTime.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / 60000 / TIME_MULTIPLIER);
        const elapsedSeconds = Math.floor((elapsedMs / 1000 / TIME_MULTIPLIER) % 60);
        
        setWashingTime(`${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [myQueueItem]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 border-2 border-blue-400 w-full max-w-lg">
        {myQueueItem.status === QueueStatus.KEY_ISSUED && (
          <>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-white mb-2">🔑 Ключ выдан!</h3>
              <p className="text-blue-100">Идите к стиралке и нажмите кнопку когда начнете стирать</p>
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
                {TEST_MODE && <div className="text-xs text-blue-200 mt-1">(TEST MODE - 60x)</div>}
              </div>
              <p className="text-blue-100 text-sm">Нажмите кнопку когда закончите стирать</p>
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
