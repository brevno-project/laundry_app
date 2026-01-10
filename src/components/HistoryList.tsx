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

  const getDurationMinutes = (start: string, end: string | null | undefined) => {
    if (!end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(ms / 60000);
    return minutes < 0 ? 0 : minutes;
  };

  const getTimerColor = (minutes: number, normalLimit: number, warningLimit: number) => {
    if (minutes > warningLimit) return { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', icon: 'bg-red-500' };
    if (minutes > normalLimit) return { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', icon: 'bg-yellow-500' };
    return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', icon: 'bg-green-500' };
  };

  const getCardBorderColor = (totalMinutes: number) => {
    if (totalMinutes > 120) return 'border-red-400';
    if (totalMinutes > 90) return 'border-yellow-400';
    return 'border-green-400';
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

      {/* History Cards with Smart Color Coding */}
      <div className="space-y-3">
        {displayedHistory.map((item) => {
          const totalMinutes = getDurationMinutes(item.started_at, item.finished_at);
          const borderColor = getCardBorderColor(totalMinutes);
          
          return (
            <div
              key={item.id}
              className={`bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md border-2 ${borderColor} hover:shadow-lg transition-all p-5`}
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

              {/* Time Info with Color-Coded Timers */}
              <div className="space-y-2">
                {/* Total Duration */}
                <div className="bg-white rounded-xl p-3 border-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <ClockIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Общее время</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {formatDuration(item.started_at, item.finished_at)}
                    </span>
                  </div>
                </div>

                {/* Washing Timer */}
                {item.washing_started_at && (() => {
                  const washMinutes = getDurationMinutes(item.washing_started_at, item.return_requested_at || item.finished_at);
                  const washColor = getTimerColor(washMinutes, 60, 90);
                  return (
                    <div className={`${washColor.bg} rounded-xl p-3 border-2 ${washColor.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${washColor.icon} rounded-lg flex items-center justify-center`}>
                            <ClockIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className={`text-sm font-medium ${washColor.text}`}>Стирка</span>
                        </div>
                        <span className={`text-lg font-bold ${washColor.text}`}>
                          {formatDuration(item.washing_started_at, item.return_requested_at || item.finished_at)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Key Pickup Timer */}
                {item.ready_at && item.key_issued_at && (() => {
                  const keyMinutes = getDurationMinutes(item.ready_at, item.key_issued_at);
                  const keyColor = getTimerColor(keyMinutes, 5, 15);
                  return (
                    <div className={`${keyColor.bg} rounded-xl p-3 border-2 ${keyColor.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${keyColor.icon} rounded-lg flex items-center justify-center`}>
                            <CheckIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className={`text-sm font-medium ${keyColor.text}`}>За ключом</span>
                        </div>
                        <span className={`text-lg font-bold ${keyColor.text}`}>
                          {formatDuration(item.ready_at, item.key_issued_at)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Colorful Load More Button with Bigger Arrow */}
      {history.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
        >
          <span className="text-lg">{showAll ? 'Скрыть' : `Показать еще ${history.length - 10}`}</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={showAll ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </button>
      )}
    </div>
  );
}
