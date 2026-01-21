"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { UiLanguage, useUi } from '@/contexts/UiContext';
import Avatar from '@/components/Avatar';
import Timer from './Timer';
import { HistoryIcon, ClockIcon, CheckIcon, MoneyIcon, TicketIcon, WashingIcon, DeleteIcon, WashingSpinner } from './Icons';
import { supabase } from '@/lib/supabase';

const formatTime = (dateStr?: string | null, locale: string = 'ru-RU') => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr?: string | null, locale: string = 'ru-RU') => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
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

const formatDuration = (start: string | null | undefined, end: string | null | undefined, language: UiLanguage) => {
  if (!start || !end) return '-';
  const minutes = getDurationMinutes(start, end);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const units =
    language === 'ru'
      ? { h: 'ч', m: 'мин' }
      : language === 'en'
        ? { h: 'h', m: 'min' }
        : language === 'ko'
          ? { h: '시간', m: '분' }
          : { h: 'саат', m: 'мүн' };
  if (hours > 0) return `${hours} ${units.h} ${mins} ${units.m}`;
  return `${mins} ${units.m}`;
};

const getCardTone = (_totalMinutes: number) => {
  return { border: 'border-slate-200', bg: 'bg-white' };
};

const labelIconClass = "w-5 h-5 text-slate-600 dark:text-slate-300";
const labelTextClass = "text-sm font-semibold text-slate-700 dark:text-slate-300";
const valueTextClass = "text-sm font-semibold text-slate-900 dark:text-slate-100";

const getEarliestDate = (dates: Array<string | null | undefined>) => {
  const parsed = dates
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter((item) => !Number.isNaN(item.time));

  if (parsed.length === 0) return null;
  parsed.sort((a, b) => a.time - b.time);
  return parsed[0].value;
};

export default function HistoryList() {
  const { history, historyTotalCount, historyHasMore, loadMoreHistory, isSuperAdmin, fetchHistory, students } = useLaundry();
  const { t, language } = useUi();
  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'ko' ? 'ko-KR' : 'ky-KG';
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showClearTools, setShowClearTools] = useState(false);
  const [clearFrom, setClearFrom] = useState('');
  const [clearTo, setClearTo] = useState('');
  const [clearRoom, setClearRoom] = useState('');
  const [clearNotice, setClearNotice] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const alertWithCheck = (message: string) => {
    const trimmed = message.trim();
    const suffix = trimmed.endsWith("✅") ? "" : " ✅";
    alert(`${message}${suffix}`);
  };

  const getPaymentLabel = (paymentType?: string | null, couponsUsed?: number | null) => {
    const couponCount = couponsUsed || 0;
    if (couponCount > 0) {
      return paymentType === 'both'
        ? t('payment.couponsMoney', { count: couponCount })
        : t('payment.coupons', { count: couponCount });
    }
    if (!paymentType) return '-';
    if (paymentType === 'coupon') return t('payment.coupon');
    if (paymentType === 'both') return t('payment.couponMoney');
    if (paymentType === 'money' || paymentType === 'cash') return t('payment.money');
    return paymentType;
  };

  const authedFetch = async (url: string, options: RequestInit = {}) => {
    if (!supabase) {
      throw new Error(t("errors.supabaseNotConfigured"));
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error(t("errors.noActiveSession"));
    }
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const clearHistory = async (mode: 'all' | 'range') => {
    if (clearing) return;
    setClearNotice(null);

    const payload =
      mode === 'all'
        ? { mode }
        : {
            mode,
            from: clearFrom || null,
            to: clearTo || null,
            room: clearRoom.trim() || null,
          };

    if (mode === 'range' && !payload.from && !payload.to && !payload.room) {
      setClearNotice(t("history.clearRangeMissing"));
      return;
    }

    const confirmText =
      mode === 'all'
        ? t("history.clearConfirmAll")
        : t("history.clearConfirmRange");
    if (!confirm(confirmText)) return;

    setClearing(true);
    try {
      const response = await authedFetch('/api/admin/history/clear', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t("history.clearError"));
      }
      await fetchHistory();
      setClearNotice(t("history.clearDeleted", { count: result.count ?? 0 }));
      setClearFrom('');
      setClearTo('');
      setClearRoom('');
    } catch (error) {
      const message = error instanceof Error ? error.message : t("history.clearError");
      setClearNotice(message);
    } finally {
      setClearing(false);
    }
  };

  const clearHistoryItem = async (historyId: string) => {
    if (clearing) return;
    const confirmed = confirm(t("history.deleteConfirm"));
    if (!confirmed) return;
    setClearing(true);
    try {
      const response = await authedFetch('/api/admin/history/clear', {
        method: 'POST',
        body: JSON.stringify({ mode: 'single', id: historyId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t("history.deleteError"));
      }
      await fetchHistory();
      alertWithCheck(t("history.deleteSuccess"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("history.deleteError");
      alertWithCheck(t("history.deleteErrorAlert", { message }));
    } finally {
      setClearing(false);
    }
  };


  if (history.length === 0) {
    return (
      <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-12 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
            <HistoryIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{t("history.emptyTitle")}</h3>
          <p className="text-gray-600">{t("history.emptyHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl shadow-md p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900">
        <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.35), transparent 40%)' }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
              <HistoryIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{t("history.title")}</h2>
              <p className="text-blue-100 text-sm">{t("history.total", { count: historyTotalCount })}</p>
            </div>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setShowClearTools((prev) => !prev);
                setClearNotice(null);
              }}
              className="btn btn-secondary"
            >
              {showClearTools ? t("history.clearHide") : t("history.clear")}
            </button>
          )}
        </div>
      </div>
      {isSuperAdmin && showClearTools && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">{t("history.from")}</label>
              <input
                type="date"
                value={clearFrom}
                onChange={(event) => setClearFrom(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">{t("history.to")}</label>
              <input
                type="date"
                value={clearTo}
                onChange={(event) => setClearTo(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">{t("history.room")}</label>
              <input
                type="text"
                value={clearRoom}
                onChange={(event) => setClearRoom(event.target.value)}
                placeholder={t("history.roomPlaceholder")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
              />
            </div>
            <button
              onClick={() => clearHistory('range')}
              disabled={clearing}
              className="btn btn-primary"
            >
              {t("history.clearRange")}
            </button>
            <button
              onClick={() => clearHistory('all')}
              disabled={clearing}
              className="btn btn-danger"
            >
              {t("history.clearAll")}
            </button>
          </div>
          {clearNotice && (
            <p className="mt-3 text-sm text-slate-600">{clearNotice}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {history.map((item) => {
          const cycleStart = getEarliestDate([
            item.ready_at,
            item.key_issued_at,
            item.washing_started_at,
            item.return_requested_at,
          ]);
          const cycleEnd = item.finished_at ?? item.washing_finished_at ?? null;
          const hasCycleTimes = Boolean(cycleStart && cycleEnd);
          const totalMinutes = hasCycleTimes ? getDurationMinutes(cycleStart, cycleEnd) : 0;
          const totalDuration = hasCycleTimes ? formatDuration(cycleStart, cycleEnd, language) : '-';
          const cardTone = hasCycleTimes ? getCardTone(totalMinutes) : { border: 'border-slate-200', bg: 'bg-white' };

          const washStart = item.washing_started_at ?? null;
          const washEnd = item.washing_finished_at ?? null;
          const hasWashTimes = Boolean(washStart && washEnd);
          const washingDuration = hasWashTimes ? formatDuration(washStart, washEnd, language) : '-';

          const washCount = item.wash_count ?? '-';
          const couponsUsed = item.coupons_used ?? 0;
          const paymentType = item.payment_type ?? null;
          const paymentLabel = getPaymentLabel(paymentType, couponsUsed);
          const paymentIcons = couponsUsed > 0
            ? paymentType === 'both'
              ? (
                <>
                  <TicketIcon className="w-4 h-4 text-purple-600" />
                  <MoneyIcon className="w-4 h-4 text-purple-600" />
                </>
              )
              : <TicketIcon className="w-4 h-4 text-purple-600" />
            : paymentType === 'money' || paymentType === 'cash'
              ? <MoneyIcon className="w-4 h-4 text-purple-600" />
              : null;

          return (
            <div
              key={item.id}
              className={`rounded-2xl shadow-sm border ${cardTone.border} ${cardTone.bg} dark:bg-slate-800 dark:border-slate-600 hover:shadow-md transition-all p-5`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      name={item.full_name}
                      style={(() => {
                        const student = students.find(s => s.id === item.student_id);
                        return student?.avatar_style || item.avatar_style;
                      })()}
                      seed={(() => {
                        const student = students.find(s => s.id === item.student_id);
                        return student?.avatar_seed || item.avatar_seed;
                      })()}
                      className="w-12 h-12 rounded-xl shadow-md"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg dark:text-slate-100">{item.full_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      {item.room ? `${t("history.room")} ${item.room} - ` : ''}{formatDate(item.finished_at, locale)}
                    </p>
                  </div>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={() => clearHistoryItem(item.id)}
                    className="btn btn-danger px-3 py-1.5 text-xs"
                  >
                    <DeleteIcon className="w-4 h-4" />
                    {t("history.delete")}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`flex items-center gap-2 ${labelTextClass}`}>
                        <ClockIcon className={labelIconClass} />{t("history.washStart")}
                      </div>
                      <span className={valueTextClass}>{formatTime(cycleStart, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className={`flex items-center gap-2 ${labelTextClass}`}>
                        <CheckIcon className={labelIconClass} />{t("history.washEnd")}
                      </div>
                      <span className={valueTextClass}>{formatTime(cycleEnd, locale)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("history.totalTime")}</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">{totalDuration}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("history.washCount")}</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{washCount}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("history.payment")}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        {paymentIcons}
                        {paymentLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.return_requested_at && item.finished_at && (
                    <Timer 
                      startTime={item.return_requested_at} 
                      endTime={item.finished_at}
                      label={t("history.keyReturned")} 
                      color="orange"
                    />
                  )}

                  {item.washing_started_at && (item.washing_finished_at || item.return_requested_at || item.finished_at) && (
                    <Timer 
                      startTime={item.washing_started_at} 
                      endTime={
                        item.washing_finished_at ||
                        item.return_requested_at ||
                        item.finished_at
                      }
                      label={t("history.washing")} 
                      color="green"
                      multiplier={item.wash_count || 1}
                    />
                  )}

                  {item.key_issued_at && item.washing_started_at && (
                    <Timer 
                      startTime={item.key_issued_at} 
                      endTime={item.washing_started_at}
                      label={t("history.keyIssued")} 
                      color="blue"
                    />
                  )}

                  {item.ready_at && item.key_issued_at && (
                    <Timer 
                      startTime={item.ready_at} 
                      endTime={item.key_issued_at}
                      label={t("history.keyFetch")} 
                      color="yellow"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {historyHasMore && (
        <button
          onClick={async () => {
            setIsLoadingMore(true);
            await loadMoreHistory();
            setIsLoadingMore(false);
          }}
          className="w-full btn btn-secondary btn-lg"
          disabled={isLoadingMore}
        >
          <span className="text-lg">
            {isLoadingMore ? (
              <>
                <WashingSpinner className="w-5 h-5" />
                <span>{t("history.loadingMore")}</span>
              </>
            ) : (
              <>{t("history.loadMore")}</>
            )}
          </span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}





