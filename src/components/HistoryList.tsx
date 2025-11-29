"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { formatDate } from '@/contexts/LaundryContext';
import Timer from './Timer';
import { HistoryIcon } from './Icons';

export default function HistoryList() {
  const { history } = useLaundry();

  // Функция для определения цвета таймера в зависимости от времени
  const getTimerColor = (startTime: string, endTime: string | null | undefined, redZoneMinutes: number): 'yellow' | 'blue' | 'green' | 'orange' => {
    if (!endTime) return 'green';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const elapsedMinutes = (end - start) / 60000;
    return elapsedMinutes > redZoneMinutes ? 'orange' : 'green';
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
      <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2"><HistoryIcon className="w-6 h-6" />История</h2>
      <div className="space-y-3">
        {history.map((item) => (
          <div 
            key={item.id} 
            className="p-4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-md border-l-4 border-green-600 shadow-sm"
          >
            <p className="font-bold text-gray-900 text-base">{item.full_name} {item.room && `(Комната ${item.room})`}</p>
            
            {/* ✅ Таймеры истории */}
            <div className="flex flex-wrap gap-2 mt-3 mb-2">
              {item.ready_at && (
                <Timer 
                  startTime={item.ready_at} 
                  endTime={item.key_issued_at}
                  label="За ключом" 
                  color={getTimerColor(item.ready_at, item.key_issued_at, 15)}
                />
              )}
              {item.key_issued_at && (
                <Timer 
                  startTime={item.key_issued_at} 
                  endTime={item.washing_started_at}
                  label="С ключом" 
                  color={getTimerColor(item.key_issued_at, item.washing_started_at, 5)}
                />
              )}
              {item.washing_started_at && (
                <Timer 
                  startTime={item.washing_started_at} 
                  endTime={item.return_requested_at || item.finished_at}
                  label="Стирка" 
                  color={getTimerColor(item.washing_started_at, item.return_requested_at || item.finished_at, 120)}
                />
              )}
              {item.return_requested_at && (
                <Timer 
                  startTime={item.return_requested_at} 
                  endTime={item.finished_at}
                  label="Возврат ключа" 
                  color={getTimerColor(item.return_requested_at, item.finished_at, 5)}
                />
              )}
            </div>
            
            <div className="text-sm text-gray-700 mt-2 space-y-1">
              <p><span className="font-semibold">Начато:</span> {formatDate(item.started_at)}</p>
              <p><span className="font-semibold">Завершено:</span> {formatDate(item.finished_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
