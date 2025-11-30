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
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-lg">{item.full_name}</h3>
              {item.room && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200">
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 border border-blue-600 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative">
                  <div className="text-xs font-medium text-blue-100 uppercase tracking-wider mb-1.5">Начало</div>
                  <div className="text-sm font-semibold text-white">{formatDate(item.started_at)}</div>
                </div>
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 border border-emerald-600 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative">
                  <div className="text-xs font-medium text-emerald-100 uppercase tracking-wider mb-1.5">Завершение</div>
                  <div className="text-sm font-semibold text-white">{formatDate(item.finished_at)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
