"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { formatDate } from '@/contexts/LaundryContext';
import { HistoryIcon, ClockIcon, CheckIcon, WashingIcon, KeyIcon } from './Icons';
import Avatar, { AvatarType } from '@/components/Avatar';
import { useState, useMemo } from 'react';

export default function HistoryList() {
  const { history } = useLaundry();
  const [showAll, setShowAll] = useState(false);
  
  const displayedHistory = showAll ? history : history.slice(0, 5);
  
  // Helper functions - defined before useMemo
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

  const getDurationMinutes = (start: string, end: string | null | undefined) => {
    if (!end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(ms / 60000);
  };

  const getTimeColor = (minutes: number, yellowZone: number, redZone: number) => {
    if (minutes >= redZone) return 'red';
    if (minutes >= yellowZone) return 'yellow';
    return 'green';
  };
  
  // Статистика
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    
    const totalWashes = history.length;
    const avgWashTime = history
      .filter(h => h.washing_started_at)
      .reduce((sum, h) => {
        const mins = getDurationMinutes(h.washing_started_at!, h.return_requested_at || h.finished_at);
        return sum + mins;
      }, 0) / history.filter(h => h.washing_started_at).length;
    
    const fastestWash = history
      .filter(h => h.washing_started_at)
      .reduce((min, h) => {
        const mins = getDurationMinutes(h.washing_started_at!, h.return_requested_at || h.finished_at);
        return mins < min ? mins : min;
      }, Infinity);
    
    const slowestWash = history
      .filter(h => h.washing_started_at)
      .reduce((max, h) => {
        const mins = getDurationMinutes(h.washing_started_at!, h.return_requested_at || h.finished_at);
        return mins > max ? mins : max;
      }, 0);
    
    return { totalWashes, avgWashTime, fastestWash, slowestWash };
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl shadow-lg border border-indigo-100 p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
        <div className="relative flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
            <HistoryIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">История пуста</h3>
            <p className="text-gray-600">Завершенные стирки появятся здесь</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <HistoryIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">История</h2>
              <p className="text-white/80">{history.length} {history.length === 1 ? 'запись' : 'записей'}</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <WashingIcon className="w-4 h-4 text-white/80" />
                  <span className="text-xs text-white/80 font-medium">Всего</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalWashes}</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <ClockIcon className="w-4 h-4 text-white/80" />
                  <span className="text-xs text-white/80 font-medium">Среднее</span>
                </div>
                <div className="text-2xl font-bold text-white">{Math.round(stats.avgWashTime)}м</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckIcon className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs text-white/80 font-medium">Быстрее</span>
                </div>
                <div className="text-2xl font-bold text-emerald-300">{Math.round(stats.fastestWash)}м</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <ClockIcon className="w-4 h-4 text-red-300" />
                  <span className="text-xs text-white/80 font-medium">Дольше</span>
                </div>
                <div className="text-2xl font-bold text-red-300">{Math.round(stats.slowestWash)}м</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Items */}
      <div className="space-y-4">
        {displayedHistory.map((item, index) => {
          const totalDuration = formatDuration(
            item.started_at,
            item.finished_at
          );
          
          return (
            <div
              key={item.id}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl border border-gray-200/50 hover:border-indigo-200 transition-all duration-300 overflow-hidden"
            >
              {/* Animated gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 group-hover:h-2 transition-all duration-300"></div>
              
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar 
                        type={(item.avatar_type as AvatarType) || 'default'} 
                        className="w-14 h-14 ring-4 ring-indigo-100 group-hover:ring-indigo-200 transition-all" 
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                        <CheckIcon className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xl mb-1">{item.full_name}</h3>
                      <div className="flex items-center gap-2">
                        {item.room && (
                          <span className="text-sm font-medium text-gray-600">Комната {item.room}</span>
                        )}
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.finished_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
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

                {/* Stats with color coding */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Duration */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200/50">
                    <div className="text-xs font-medium text-gray-500 mb-1">Общее</div>
                    <div className="text-lg font-bold text-gray-900">{totalDuration}</div>
                  </div>

                  {/* Washing time with color */}
                  {item.washing_started_at && (() => {
                    const washMinutes = getDurationMinutes(item.washing_started_at, item.return_requested_at || item.finished_at);
                    const washColor = getTimeColor(washMinutes, 80, 120);
                    const colorClasses = {
                      green: 'from-emerald-50 to-emerald-100 border-emerald-200/50 text-emerald-600',
                      yellow: 'from-yellow-50 to-yellow-100 border-yellow-300/50 text-yellow-700',
                      red: 'from-red-50 to-red-100 border-red-300/50 text-red-700 ring-2 ring-red-200'
                    };
                    return (
                      <div className={`bg-gradient-to-br rounded-xl p-3 border ${colorClasses[washColor]}`}>
                        <div className="text-xs font-medium mb-1">Стирка</div>
                        <div className="text-lg font-bold">
                          {formatDuration(item.washing_started_at, item.return_requested_at || item.finished_at)}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Key time with color */}
                  {item.ready_at && item.key_issued_at && (() => {
                    const keyMinutes = getDurationMinutes(item.ready_at, item.key_issued_at);
                    const keyColor = getTimeColor(keyMinutes, 5, 15);
                    const colorClasses = {
                      green: 'from-emerald-50 to-emerald-100 border-emerald-200/50 text-emerald-600',
                      yellow: 'from-yellow-50 to-yellow-100 border-yellow-300/50 text-yellow-700',
                      red: 'from-red-50 to-red-100 border-red-300/50 text-red-700 ring-2 ring-red-200'
                    };
                    return (
                      <div className={`bg-gradient-to-br rounded-xl p-3 border ${colorClasses[keyColor]}`}>
                        <div className="text-xs font-medium mb-1">За ключом</div>
                        <div className="text-lg font-bold">
                          {formatDuration(item.ready_at, item.key_issued_at)}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {history.length > 5 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            {showAll ? (
              <>
                <span>Скрыть старые</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Показать старые ({history.length - 5})</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
