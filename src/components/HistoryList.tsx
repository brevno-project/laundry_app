"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { UiLanguage, useUi } from '@/contexts/UiContext';
import Avatar from '@/components/Avatar';
import Timer from './Timer';
import { HistoryIcon, ClockIcon, CheckIcon, MoneyIcon, TicketIcon, WashingIcon, DeleteIcon, WashingSpinner } from './Icons';
import { supabase } from '@/lib/supabase';
import { HistoryItem } from '@/types';

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
  const [clearing, setClearing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null);

  const alertWithCheck = (message: string) => {
    const trimmed = message.trim();
    const suffix = trimmed.endsWith("✅") ? "" : " ✅";
    alert(`${message}${suffix}`);
  };

  const clearHistoryForOwner = async ({ studentId, userId }: { studentId?: string | null; userId?: string | null }) => {
    if (clearing) return;
    if (!studentId && !userId) return;
    setClearing(true);
    try {
      const response = await authedFetch('/api/admin/history/clear', {
        method: 'POST',
        body: JSON.stringify({ mode: 'range', student_id: studentId, user_id: userId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t("history.clearError"));
      }
      await fetchHistory();
      alertWithCheck(t("history.deleteSuccess"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("history.clearError");
      alertWithCheck(t("history.deleteErrorAlert", { message }));
    } finally {
      setClearing(false);
    }
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

  const clearHistoryItem = async (historyId: string) => {
    if (clearing) return;
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

  const handleDeleteSingle = async () => {
    if (!pendingDelete) return;
    try {
      await clearHistoryItem(pendingDelete.id);
    } finally {
      setPendingDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!pendingDelete) return;
    try {
      await clearHistoryForOwner({ studentId: pendingDelete.student_id, userId: pendingDelete.user_id });
    } finally {
      setPendingDelete(null);
    }
  };


  if (history.length === 0) {
    return (
      <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-12 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center shadow-md">
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
      <div className="relative overflow-hidden rounded-2xl shadow-sm p-5 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center dark:bg-slate-700">
              <HistoryIcon className="w-6 h-6 text-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("history.title")}</h2>
              <p className="text-slate-600 text-sm dark:text-slate-300">{t("history.total", { count: historyTotalCount })}</p>
            </div>
          </div>
        </div>
      </div>

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
                      className="w-12 h-12 rounded-full"
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
                    onClick={() => {
                      if (clearing) return;
                      setPendingDelete(item);
                    }}
                    disabled={clearing}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25"
                  >
                    <DeleteIcon className="w-4 h-4" />
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
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{totalDuration}</span>
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

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {(pendingDelete.student_id || pendingDelete.user_id) ? t("history.deleteChoiceTitle") : t("history.deleteConfirm")}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {(pendingDelete.student_id || pendingDelete.user_id)
                ? t("history.deleteChoiceBody", { name: pendingDelete.full_name })
                : t("history.deleteConfirm")}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {(pendingDelete.student_id || pendingDelete.user_id) && (
                <>
                  <button
                    type="button"
                    onClick={handleDeleteSingle}
                    disabled={clearing}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {t("history.deleteOnly")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={clearing}
                    className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {t("history.deleteAllUser")}
                  </button>
                </>
              )}
              {!pendingDelete.student_id && (
                <button
                  type="button"
                  onClick={handleDeleteSingle}
                  disabled={clearing}
                  className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {t("history.delete")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={clearing}
                className="w-full rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





