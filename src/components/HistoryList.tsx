"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { HistoryIcon, ClockIcon, CheckIcon } from './Icons';
import Avatar, { AvatarType } from '@/components/Avatar';
import { useState } from 'react';

export default function HistoryList() {
  const { history } = useLaundry();
  const [showAll, setShowAll] = useState(false);
  
  const displayedHistory = showAll ? history : history.slice(0, 10);
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start: string, end: string | null | undefined) => {
    if (!end) return '—';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 0) return '0м';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (history.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-md border-2 border-green-200 p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <HistoryIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">История пуста</h3>
          <p className="text-gray-600">Завершенные стирки появятся здесь</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Colorful Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <HistoryIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">История</h2>
              <p className="text-green-100 text-sm">{history.length} завершенных стирок</p>
            </div>
          </div>
        </div>
      </div>

      {/* Colorful History Cards */}
      <div className="space-y-3">
        {displayedHistory.map((item, index) => {
          const colors = [
            'from-blue-50 to-blue-100 border-blue-200',
            'from-purple-50 to-purple-100 border-purple-200',
            'from-pink-50 to-pink-100 border-pink-200',
            'from-orange-50 to-orange-100 border-orange-200',
            'from-teal-50 to-teal-100 border-teal-200',
          ];
          const colorClass = colors[index % colors.length];
          
          return (
            <div
              key={item.id}
              className={`bg-gradient-to-br ${colorClass} rounded-2xl shadow-md border-2 hover:shadow-lg transition-all p-5`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar 
                      type={(item.avatar_type as AvatarType) || 'default'} 
                      className="w-12 h-12 ring-4 ring-white shadow-md" 
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{item.full_name}</h3>
                    <p className="text-sm text-gray-600">
                      {item.room && `Комната ${item.room} • `}
                      {formatDate(item.finished_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Info with Icons */}
              <div className="bg-white/60 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <ClockIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Время</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatTime(item.started_at)} - {formatTime(item.finished_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Длительность</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatDuration(item.started_at, item.finished_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Colorful Load More Button */}
      {history.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg hover:shadow-xl transition-all text-lg"
        >
          {showAll ? '↑ Скрыть' : `↓ Показать еще ${history.length - 10}`}
        </button>
      )}
    </div>
  );
}
