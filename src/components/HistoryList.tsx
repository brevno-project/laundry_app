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
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3 pb-3 border-b-2 border-gray-200">
        <HistoryIcon className="w-7 h-7 text-gray-700" />
        История
      </h2>
      <div className="space-y-4">
        {history.map((item) => (
          <div 
            key={item.id} 
            className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg">{item.full_name}</h3>
              {item.room && (
                <span className="text-sm font-bold text-gray-900 bg-gradient-to-r from-gray-200 to-gray-300 px-3 py-1.5 rounded-lg shadow-sm">
                  {item.room}
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
            <div className="flex flex-col bg-gradient-to-br from-gray-100 to-gray-200 p-3 rounded-lg border border-gray-300 shadow-sm">
                <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide mb-1">Начало</span>
                <span className="text-gray-900 font-semibold">{formatDate(item.started_at)}</span>
              </div>
              <div className="flex flex-col bg-gradient-to-br from-gray-100 to-gray-200 p-3 rounded-lg border border-gray-300 shadow-sm">
                <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide mb-1">Завершение</span>
                <span className="text-gray-900 font-semibold">{formatDate(item.finished_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
