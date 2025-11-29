"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { formatDate } from '@/contexts/LaundryContext';
import Timer from './Timer';
import { HistoryIcon } from './Icons';

export default function HistoryList() {
  const { history } = useLaundry();

  // Функция для определения цвета таймера в зависимости от времени
  // Зеленая зона: 0 - yellowZone
  // Желтая зона: yellowZone - redZone
  // Красная зона: > redZone
  const getTimerColor = (startTime: string, endTime: string | null | undefined, yellowZoneMinutes: number, redZoneMinutes: number): 'yellow' | 'blue' | 'green' | 'orange' => {
    if (!endTime) return 'green';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const elapsedMinutes = (end - start) / 60000;
    
    if (elapsedMinutes > redZoneMinutes) return 'orange'; // Красная зона
    if (elapsedMinutes > yellowZoneMinutes) return 'yellow'; // Желтая зона
    return 'green'; // Зеленая зона
  };

  if (history.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2"><HistoryIcon className="w-6 h-6" />История</h2>
        <p className="text-gray-700 text-lg">История пуста.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <HistoryIcon className="w-7 h-7" />
        История
      </h2>
      <div className="space-y-4">
        {history.map((item) => (
          <div 
            key={item.id} 
            className="p-5 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl border-l-4 border-green-500 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-lg">{item.full_name}</h3>
              {item.room && (
                <span className="text-sm font-semibold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
                  Комната {item.room}
                </span>
              )}
            </div>
            
            {/* ✅ Таймеры истории */}
            <div className="flex flex-wrap gap-2 mt-3 mb-2">
              {item.ready_at && (
                <Timer 
                  startTime={item.ready_at} 
                  endTime={item.key_issued_at}
                  label="За ключом" 
                  color={getTimerColor(item.ready_at, item.key_issued_at, 5, 15)}
                />
              )}
              {item.key_issued_at && (
                <Timer 
                  startTime={item.key_issued_at} 
                  endTime={item.washing_started_at}
                  label="С ключом" 
                  color={getTimerColor(item.key_issued_at, item.washing_started_at, 5, 15)}
                />
              )}
              {item.washing_started_at && (
                <Timer 
                  startTime={item.washing_started_at} 
                  endTime={item.return_requested_at || item.finished_at}
                  label="Стирка" 
                  color={getTimerColor(item.washing_started_at, item.return_requested_at || item.finished_at, 80, 120)}
                />
              )}
              {item.return_requested_at && (
                <Timer 
                  startTime={item.return_requested_at} 
                  endTime={item.finished_at}
                  label="Возврат ключа" 
                  color={getTimerColor(item.return_requested_at, item.finished_at, 5, 15)}
                />
              )}
            </div>
            
            <div className="space-y-2 mt-3 text-sm">
              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                <span className="font-semibold text-blue-900 min-w-[90px]">Начато:</span>
                <span className="text-gray-700">{formatDate(item.started_at)}</span>
              </div>
              <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg border border-green-200">
                <span className="font-semibold text-green-900 min-w-[90px]">Завершено:</span>
                <span className="text-gray-700">{formatDate(item.finished_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
