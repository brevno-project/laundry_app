"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { formatDate } from '@/contexts/LaundryContext';
import { HistoryIcon, ClockIcon, CheckIcon } from './Icons';
import Avatar, { AvatarType } from '@/components/Avatar';

export default function HistoryList() {
  const { history } = useLaundry();

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start: string, end: string | null | undefined) => {
    if (!end) return '—';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
  };

  if (history.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm border border-gray-200/50 p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gray-200/50 flex items-center justify-center">
            <HistoryIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">История пуста</h3>
          <p className="text-sm text-gray-500">Завершенные стирки появятся здесь</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <HistoryIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">История</h2>
          <p className="text-sm text-gray-500">{history.length} {history.length === 1 ? 'запись' : 'записей'}</p>
        </div>
      </div>

      {/* History Items */}
      <div className="space-y-3">
        {history.map((item, index) => {
          const totalDuration = formatDuration(
            item.started_at,
            item.finished_at
          );
          
          return (
            <div
              key={item.id}
              className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-200/50 hover:border-gray-300 transition-all duration-300 overflow-hidden"
            >
              {/* Gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      type={(item.avatar_type as AvatarType) || 'default'} 
                      className="w-12 h-12 ring-2 ring-gray-100" 
                    />
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{item.full_name}</h3>
                      {item.room && (
                        <span className="text-xs font-medium text-gray-500">Комната {item.room}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                    <CheckIcon className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">Завершено</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-2 mb-4">
                  {/* Start */}
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <ClockIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Начало</span>
                      <span className="text-sm font-bold text-gray-900">{formatTime(item.started_at)}</span>
                    </div>
                  </div>

                  {/* Finish */}
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Завершение</span>
                      <span className="text-sm font-bold text-gray-900">{formatTime(item.finished_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Duration */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200/50">
                    <div className="text-xs font-medium text-gray-500 mb-1">Время</div>
                    <div className="text-lg font-bold text-gray-900">{totalDuration}</div>
                  </div>

                  {/* Washing time */}
                  {item.washing_started_at && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200/50">
                      <div className="text-xs font-medium text-blue-600 mb-1">Стирка</div>
                      <div className="text-lg font-bold text-blue-900">
                        {formatDuration(item.washing_started_at, item.return_requested_at || item.finished_at)}
                      </div>
                    </div>
                  )}

                  {/* Key time */}
                  {item.ready_at && item.key_issued_at && (
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 border border-amber-200/50">
                      <div className="text-xs font-medium text-amber-600 mb-1">За ключом</div>
                      <div className="text-lg font-bold text-amber-900">
                        {formatDuration(item.ready_at, item.key_issued_at)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
