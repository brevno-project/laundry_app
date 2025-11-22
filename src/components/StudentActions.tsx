"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';

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
      await setQueueStatus(myQueueItem.id, QueueStatus.RETURNING_KEY);

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

      alert('✅ Стирка завершена! Заберите вещи и верните ключ.');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ Ошибка при завершении стирки');
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 border-2 border-blue-400">
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
              <p className="text-blue-100">Нажмите кнопку когда закончите стирать</p>
            </div>
            <button
              onClick={handleFinishWashing}
              className="w-full bg-white text-blue-700 font-bold py-4 px-6 rounded-xl text-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ✅ Закончил стирать
            </button>
          </>
        )}
      </div>
    </div>
  );
}
