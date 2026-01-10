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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <HistoryIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700">История пуста</h3>
          <p className="text-sm text-gray-500">Завершенные стирки появятся здесь</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">История</h2>
        </div>
        <span className="text-sm text-gray-500">{history.length} записей</span>
      </div>

      {/* History Items - Simple Cards */}
      <div className="space-y-3">
        {displayedHistory.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar 
                  type={(item.avatar_type as AvatarType) || 'default'} 
                  className="w-10 h-10" 
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{item.full_name}</h3>
                  <p className="text-xs text-gray-500">
                    {item.room && `Комната ${item.room} • `}
                    {formatDate(item.finished_at)}
                  </p>
                </div>
              </div>
              <CheckIcon className="w-5 h-5 text-green-500" />
            </div>

            {/* Time Info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <ClockIcon className="w-4 h-4" />
                <span>{formatTime(item.started_at)} - {formatTime(item.finished_at)}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-900">
                  {formatDuration(item.started_at, item.finished_at)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {history.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
        >
          {showAll ? 'Скрыть' : `Показать еще ${history.length - 10}`}
        </button>
      )}
    </div>
  );
}
