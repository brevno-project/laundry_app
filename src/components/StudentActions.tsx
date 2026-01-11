"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { useEffect, useState } from 'react';
import { KeyIcon, WashingIcon, CheckIcon, InfoIcon } from '@/components/Icons';

export default function StudentActions() {
  const { user, queue } = useLaundry();
  const [washingTime, setWashingTime] = useState<string>('0:00');
  const [startSent, setStartSent] = useState(false);
  const [finishSent, setFinishSent] = useState(false);

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

  useEffect(() => {
    setStartSent(false);
    setFinishSent(false);
  }, [myQueueItem?.id, myQueueItem?.status]);

  if (!user) return null;
  if (!myQueueItem) return null;

  const handleStartWashing = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Нет активной сессии' + " \u2705");
        return;
      }

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
        setStartSent(true);
        setTimeout(() => setStartSent(false), 5000);
      } else {
        alert('Ошибка отправки уведомления' + " \u2705");
      }
    } catch (error) {
      alert('Ошибка: ' + (error as Error).message + " \u2705");
    }
  };

  const handleFinishWashing = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Нет активной сессии' + " \u2705");
        return;
      }

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
        setFinishSent(true);
        setTimeout(() => setFinishSent(false), 5000);
      } else {
        alert('Ошибка отправки уведомления' + " \u2705");
      }
    } catch (error) {
      alert('Ошибка: ' + (error as Error).message + " \u2705");
    }
  };

  return (
    <>
      <div id="student-action-button" className="mb-6 w-full animate-slideDown">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 border-2 border-blue-400 animate-pulse-slow">
          {myQueueItem.status === QueueStatus.KEY_ISSUED && (
            <>
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <KeyIcon className="w-7 h-7 text-white flex-shrink-0" />
                  <h3 className="text-2xl font-bold text-white">Ключ выдан!</h3>
                </div>
                <p className="text-blue-100">
                  Сообщите, что вы начали стирку, чтобы админ видел статус.
                </p>
                <div className="flex items-center justify-center gap-1 text-blue-200 text-sm mt-2">
                  <InfoIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Нажмите кнопку ниже, уведомление отправится сразу.</span>
                </div>
              </div>

              {startSent ? (
                <div className="w-full rounded-xl bg-emerald-500/20 border border-emerald-200 px-4 py-3 text-emerald-50 text-center transition-all animate-slide-up">
                  <div className="flex items-center justify-center gap-2 font-semibold">
                    <CheckIcon className="w-5 h-5" />
                    Уведомление отправлено
                  </div>
                  <button
                    type="button"
                    onClick={() => setStartSent(false)}
                    className="mt-2 text-xs text-emerald-100 underline"
                  >
                    Отправить еще раз
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartWashing}
                  className="w-full bg-white text-blue-700 font-bold py-4 px-6 rounded-xl text-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Начать стирку
                </button>
              )}
            </>
          )}

          {myQueueItem.status === QueueStatus.WASHING && (
            <>
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-white mb-2">Стирка идет!</h3>
                <div className="bg-white/20 rounded-xl py-3 px-6 mb-3">
                  <div className="text-blue-100 text-sm mb-1">Время стирки:</div>
                  <div className="text-4xl font-black text-white">{washingTime}</div>
                </div>
                <p className="text-blue-100 text-sm">
                  Когда закончите, нажмите кнопку, чтобы админ получил уведомление.
                </p>
                <div className="flex items-center justify-center gap-1 text-blue-200 text-sm mt-2">
                  <InfoIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Уведомление отправляется мгновенно.</span>
                </div>
              </div>

              {finishSent ? (
                <div className="w-full rounded-xl bg-emerald-500/20 border border-emerald-200 px-4 py-3 text-emerald-50 text-center transition-all animate-slide-up">
                  <div className="flex items-center justify-center gap-2 font-semibold">
                    <CheckIcon className="w-5 h-5" />
                    Уведомление отправлено
                  </div>
                  <button
                    type="button"
                    onClick={() => setFinishSent(false)}
                    className="mt-2 text-xs text-emerald-100 underline"
                  >
                    Отправить еще раз
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleFinishWashing}
                  className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-xl text-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckIcon className="w-5 h-5" />
                    Закончить стирку
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}