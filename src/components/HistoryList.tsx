"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import Avatar, { AvatarType } from '@/components/Avatar';
import { HistoryIcon, ClockIcon, CheckIcon, MoneyIcon, TicketIcon, WashingIcon } from './Icons';

type TimerColors = {
  bg: string;
  border: string;
  text: string;
  icon: string;
};

const neutralColors: TimerColors = {
  bg: 'bg-gray-100',
  border: 'border-gray-200',
  text: 'text-gray-500',
  icon: 'bg-gray-400',
};

const formatTime = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDurationMinutes = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  let endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (endMs < startMs) {
    endMs += oneDayMs;
  }
  const minutes = Math.floor((endMs - startMs) / 60000);
  return minutes < 0 ? 0 : minutes;
};

const formatDuration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return '-';
  const minutes = getDurationMinutes(start, end);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours} ч ${mins} мин`;
  return `${mins} мин`;
};

const getTimerColor = (minutes: number, normalLimit: number, warningLimit: number): TimerColors => {
  if (minutes > warningLimit) {
    return { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', icon: 'bg-red-500' };
  }
  if (minutes > normalLimit) {
    return { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', icon: 'bg-yellow-500' };
  }
  return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', icon: 'bg-green-500' };
};

const getCardTone = (totalMinutes: number) => {
  if (totalMinutes > 120) return { border: 'border-red-400', bg: 'bg-red-50' };
  if (totalMinutes > 90) return { border: 'border-yellow-400', bg: 'bg-yellow-50' };
  return { border: 'border-green-400', bg: 'bg-green-50' };
};

const getEarliestDate = (dates: Array<string | null | undefined>) => {
  const parsed = dates
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter((item) => !Number.isNaN(item.time));

  if (parsed.length === 0) return null;
  parsed.sort((a, b) => a.time - b.time);
  return parsed[0].value;
};

const getPaymentLabel = (paymentType?: string | null) => {
  if (!paymentType) return '-';
  if (paymentType === 'coupon') return 'Купон';
  if (paymentType === 'both') return 'Деньги + Купон';
  if (paymentType === 'money' || paymentType === 'cash') return 'Деньги';
  return paymentType;
};

export default function HistoryList() {
  const { history } = useLaundry();
  const [showAll, setShowAll] = useState(false);

  const displayedHistory = showAll ? history : history.slice(0, 10);

  if (history.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-md border-2 border-green-200 p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <HistoryIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">История пуста</h3>
          <p className="text-gray-600">Записей о стирках пока нет.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <HistoryIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">История</h2>
              <p className="text-green-100 text-sm">{history.length} записей о стирках</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displayedHistory.map((item) => {
          const cycleStart = getEarliestDate([item.ready_at, item.key_issued_at, item.washing_started_at]);
          const cycleEnd = item.washing_finished_at ?? null;
          const hasCycleTimes = Boolean(cycleStart && cycleEnd);
          const totalMinutes = hasCycleTimes ? getDurationMinutes(cycleStart, cycleEnd) : 0;
          const totalDuration = hasCycleTimes ? formatDuration(cycleStart, cycleEnd) : '-';
          const cardTone = hasCycleTimes ? getCardTone(totalMinutes) : { border: 'border-gray-200', bg: 'bg-white' };

          const washStart = item.washing_started_at ?? null;
          const washEnd = item.washing_finished_at ?? null;
          const hasWashTimes = Boolean(washStart && washEnd);
          const washingDuration = hasWashTimes ? formatDuration(washStart, washEnd) : '-';

          const keyIssuedMinutes = item.ready_at && item.key_issued_at
            ? getDurationMinutes(item.ready_at, item.key_issued_at)
            : null;
          const keyReturnMinutes = item.return_requested_at && item.finished_at
            ? getDurationMinutes(item.return_requested_at, item.finished_at)
            : null;

          const washCount = item.wash_count ?? '-';
          const paymentType = item.payment_type ?? null;
          const paymentLabel = getPaymentLabel(paymentType);
          const paymentIcons = paymentType === 'coupon'
            ? <TicketIcon className="w-4 h-4 text-purple-600" />
            : paymentType === 'both'
              ? (
                <>
                  <MoneyIcon className="w-4 h-4 text-green-600" />
                  <TicketIcon className="w-4 h-4 text-purple-600" />
                </>
              )
              : paymentType === 'money' || paymentType === 'cash'
                ? <MoneyIcon className="w-4 h-4 text-green-600" />
                : null;

          const keyIssuedColors = keyIssuedMinutes === null
            ? neutralColors
            : getTimerColor(keyIssuedMinutes, 3, 10);
          const keyReturnColors = keyReturnMinutes === null
            ? neutralColors
            : getTimerColor(keyReturnMinutes, 5, 15);

          return (
            <div
              key={item.id}
              className={`rounded-2xl shadow-md border-2 ${cardTone.border} ${cardTone.bg} hover:shadow-lg transition-all p-5`}
            >
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
                      {item.room ? `Комната ${item.room} - ` : ''}{formatDate(item.finished_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                        <ClockIcon className="w-4 h-4" />Начало стирки
                      </div>
                      <span className="text-sm font-bold text-blue-900">{formatTime(cycleStart)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                        <CheckIcon className="w-4 h-4" />Конец стирки
                      </div>
                      <span className="text-sm font-bold text-blue-900">{formatTime(cycleEnd)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl p-3 border-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <ClockIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Общее время</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{totalDuration}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Количество стирок</span>
                      <span className="text-lg font-bold text-gray-900">{washCount}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Оплата</span>
                      <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                        {paymentIcons}
                        {paymentLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`${keyIssuedColors.bg} rounded-xl p-3 border-2 ${keyIssuedColors.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${keyIssuedColors.icon} rounded-lg flex items-center justify-center`}>
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className={`text-sm font-medium ${keyIssuedColors.text}`}>Ключ был выдан</span>
                      </div>
                      <span className={`text-lg font-bold ${keyIssuedColors.text}`}>
                        {keyIssuedMinutes === null ? '-' : formatDuration(item.ready_at, item.key_issued_at)}
                      </span>
                    </div>
                  </div>

                  <div className={`${keyReturnColors.bg} rounded-xl p-3 border-2 ${keyReturnColors.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${keyReturnColors.icon} rounded-lg flex items-center justify-center`}>
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className={`text-sm font-medium ${keyReturnColors.text}`}>Ключ возвращался</span>
                      </div>
                      <span className={`text-lg font-bold ${keyReturnColors.text}`}>
                        {keyReturnMinutes === null ? '-' : formatDuration(item.return_requested_at, item.finished_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
                      <WashingIcon className="w-4 h-4" />Время стирки
                    </div>
                    <span className="text-sm font-bold text-indigo-900">{washingDuration}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {history.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
        >
          <span className="text-lg">
            {showAll ? 'Скрыть' : `Показать еще ${history.length - 10}`}
          </span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d={showAll ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
            />
          </svg>
        </button>
      )}
    </div>
  );
}
