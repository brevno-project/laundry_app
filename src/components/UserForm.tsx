"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { useUi } from '@/contexts/UiContext';
import { supabase } from '@/lib/supabase';
import { CalendarIcon, MoneyIcon, TicketIcon, WashingSpinner } from '@/components/Icons';

type CouponOption = {
  id: string;
  issued_at: string;
  expires_at: string;
};

const PERMANENT_COUPON_YEARS = 5;

const isPermanentCoupon = (coupon: CouponOption) => {
  const expiresAt = new Date(coupon.expires_at).getTime();
  if (Number.isNaN(expiresAt)) return false;
  const issuedAt = new Date(coupon.issued_at).getTime();
  const baseTime = Number.isNaN(issuedAt) ? Date.now() : issuedAt;
  const thresholdMs = PERMANENT_COUPON_YEARS * 365 * 24 * 60 * 60 * 1000;
  return expiresAt - baseTime >= thresholdMs;
};

export default function UserForm() {
  const { user, joinQueue, getUserQueueItem, queue } = useLaundry();
  const { t, language } = useUi();
  const [washCount, setWashCount] = useState<number>(1);
  const [eligibleCoupons, setEligibleCoupons] = useState<CouponOption[]>([]);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);
  const [reservedCoupons, setReservedCoupons] = useState<CouponOption[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<number>(0);
  const [activeCoupons, setActiveCoupons] = useState<number>(0);
  const [couponNotice, setCouponNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const alertWithCheck = (message: string) => {
    const trimmed = message.trim();
    const suffix = trimmed.endsWith("✅") ? "" : " ✅";
    alert(`${message}${suffix}`);
  };

  const existingQueueItem = getUserQueueItem();
  const isInQueue = !!existingQueueItem;

  const queuePosition = existingQueueItem ? queue.findIndex(item => item.id === existingQueueItem.id) + 1 : 0;
  const maxCoupons = Math.min(availableCoupons, washCount);
  const selectedCouponCount = selectedCouponIds.length;
  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'ko' ? 'ko-KR' : 'ky-KG';

  const formatCouponDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatCouponLabel = (coupon: CouponOption) =>
    isPermanentCoupon(coupon)
      ? t('coupon.permanent')
      : t('coupon.until', { date: formatCouponDateTime(coupon.expires_at) });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDate(today);
  }, []);

  const getAvailableDates = () => {
    const dates = [] as Array<{ value: string; label: string }>;
    const today = new Date();

    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
      const day = date.getDate();
      const month = date.getMonth() + 1;

      let label = `${dayName}, ${day}.${month.toString().padStart(2, '0')}`;
      if (i === 0) label += ` (${t('queue.dateToday')})`;
      if (i === 1) label += ` (${t('queue.dateTomorrow')})`;

      dates.push({ value: dateStr, label });
    }

    return dates;
  };

  const isCouponValidForDate = (coupon: { issued_at: string; expires_at: string }, queueDate: string, now: Date) => {
    const issuedAt = new Date(coupon.issued_at).getTime();
    const expiresAt = new Date(coupon.expires_at).getTime();
    const ttlMs = expiresAt - issuedAt;
    const expiresDateStr = new Date(coupon.expires_at).toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    if (ttlMs >= 24 * 60 * 60 * 1000) {
      return queueDate < expiresDateStr;
    }

    return queueDate === todayStr && expiresAt > now.getTime();
  };

  const loadCoupons = async () => {
    if (!supabase || !user?.student_id || !selectedDate) {
      setEligibleCoupons([]);
      setSelectedCouponIds([]);
      setAvailableCoupons(0);
      setActiveCoupons(0);
      setCouponNotice(null);
      return;
    }

    const now = new Date();
    const { data, error } = await supabase
      .from('coupons')
      .select('id, issued_at, expires_at')
      .eq('owner_student_id', user.student_id)
      .is('reserved_queue_id', null)
      .is('used_at', null)
      .is('used_in_queue_id', null)
      .gt('expires_at', now.toISOString())
      .order('expires_at', { ascending: true });

    if (error) {
      setEligibleCoupons([]);
      setSelectedCouponIds([]);
      setAvailableCoupons(0);
      setActiveCoupons(0);
      setCouponNotice(null);
      return;
    }

    const active = (data || []);
    const eligible = active.filter((coupon) => isCouponValidForDate(coupon, selectedDate, now));

    setEligibleCoupons(eligible);
    setActiveCoupons(active.length);
    setAvailableCoupons(eligible.length);
    const eligibleIds = new Set(eligible.map((coupon) => coupon.id));
    setSelectedCouponIds((prev) => prev.filter((id) => eligibleIds.has(id)));
    setCouponNotice(
      active.length > 0 && eligible.length === 0
        ? t('queue.noEligibleCoupons')
        : null
    );
  };

  const loadReservedCoupons = async () => {
    if (!supabase || !user?.student_id || !existingQueueItem?.id) {
      setReservedCoupons([]);
      return;
    }

    const { data, error } = await supabase
      .from('coupons')
      .select('id, issued_at, expires_at')
      .eq('owner_student_id', user.student_id)
      .eq('reserved_queue_id', existingQueueItem.id)
      .order('expires_at', { ascending: true });

    if (error) {
      setReservedCoupons([]);
      return;
    }

    setReservedCoupons(data || []);
  };

  useEffect(() => {
    loadCoupons();
  }, [user?.student_id, selectedDate]);

  useEffect(() => {
    loadReservedCoupons();
  }, [existingQueueItem?.id, user?.student_id]);

  useEffect(() => {
    if (!supabase || !user?.student_id) return;
    loadCoupons();
    loadReservedCoupons();
  }, [existingQueueItem?.id, existingQueueItem?.status]);

  useEffect(() => {
    if (!supabase || !user?.student_id) return;

    const channel = supabase
      .channel(`coupons-updates-${user.student_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coupons',
          filter: `owner_student_id=eq.${user.student_id}`,
        },
        () => {
          loadCoupons();
          loadReservedCoupons();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [user?.student_id, selectedDate]);

  useEffect(() => {
    const maxAllowed = Math.min(availableCoupons, washCount);
    if (selectedCouponIds.length > maxAllowed) {
      setSelectedCouponIds((prev) => prev.slice(0, maxAllowed));
    }
  }, [availableCoupons, washCount, selectedCouponIds.length]);

  const toggleCouponSelection = (couponId: string) => {
    setSelectedCouponIds((prev) => {
      if (prev.includes(couponId)) {
        return prev.filter((id) => id !== couponId);
      }
      if (prev.length >= maxCoupons) {
        return prev;
      }
      return [...prev, couponId];
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (user?.full_name && !isInQueue && !isSubmitting) {
      setIsSubmitting(true);

      try {
        await joinQueue(
          user.full_name,
          user.room,
          washCount,
          selectedCouponCount,
          undefined,
          selectedDate,
          selectedCouponIds
        );
        setSelectedCouponIds([]);
        await loadCoupons();
      } catch (error: any) {
        alertWithCheck(error?.message || t('queue.submitError'));
      }

      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{t('queue.joinTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-bold mb-2 text-gray-700">
              {t('queue.nameLabel')}
            </label>
            <input
              id="name"
              type="text"
              value={user?.full_name || ''}
              readOnly
              className="mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm p-3 text-gray-700 cursor-not-allowed"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="room" className="block text-sm font-bold mb-2 text-gray-700">
              {t('queue.roomLabel')}
            </label>
            <input
              id="room"
              type="text"
              value={user?.room || t('queue.roomUnknown')}
              readOnly
              className="mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm p-3 text-gray-700 cursor-not-allowed"
            />
          </div>

          {!isInQueue ? (
            <>
              <div className="mb-4">
                <label htmlFor="selectedDate" className="block text-sm font-bold mb-2 text-gray-700">
                  {t('queue.dateLabel')}
                </label>
                <select
                  id="selectedDate"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  {getAvailableDates().map(date => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('queue.dateNote')}</p>
              </div>

              <div className="mb-4">
                <label htmlFor="washCount" className="block text-sm font-bold mb-2 text-gray-700">
                  {t('queue.washCount')}
                </label>
                <select
                  id="washCount"
                  value={washCount}
                  onChange={(e) => setWashCount(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-700">
                  {t('queue.couponsLabel')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t('queue.availableCoupons', { available: availableCoupons, active: activeCoupons })}
                </p>
                {couponNotice && (
                  <p className="text-xs text-red-500 mb-2">{couponNotice}</p>
                )}
                {eligibleCoupons.length === 0 ? (
                  <p className="text-xs text-gray-500">{t('queue.noEligibleCoupons')}</p>
                ) : (
                  <div className="space-y-2">
                    {eligibleCoupons.map((coupon) => {
                      const isSelected = selectedCouponIds.includes(coupon.id);
                      const isLimitReached = !isSelected && selectedCouponIds.length >= maxCoupons;
                      return (
                        <label
                          key={coupon.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white/70 backdrop-blur-sm px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCouponSelection(coupon.id)}
                              disabled={isLimitReached}
                              className="h-4 w-4"
                            />
                            <span className="font-medium">{formatCouponLabel(coupon)}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {maxCoupons > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {t('queue.couponLimit', { count: maxCoupons })}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  {selectedCouponCount > 0 ? (
                    <>
                      <TicketIcon className="w-4 h-4 text-purple-600" />
                      {selectedCouponCount >= washCount ? t('queue.paymentCoupons') : t('queue.paymentCouponsMoney')}
                    </>
                  ) : (
                    <>
                      <MoneyIcon className="w-4 h-4 text-green-600" />
                      {t('queue.paymentMoney')}
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn btn-primary btn-lg btn-glow btn-attn"
              >
                {isSubmitting ? (
                  <>
                    <WashingSpinner className="w-4 h-4" />
                    <span>{t('queue.submitting')}</span>
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-5 h-5" />
                    {t('queue.submit')}
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-md p-4">
              <p className="text-blue-800 font-bold text-center text-lg">
                {t('queue.inQueue')}
              </p>
              <p className="text-blue-600 font-black text-center mt-2 text-3xl">
                {t('queue.position', { position: queuePosition })}
              </p>
              {existingQueueItem?.scheduled_for_date && (
                <p className="text-blue-600 text-center mt-2">
                  {t('queue.scheduledFor', {
                    date: new Date(existingQueueItem.scheduled_for_date).toLocaleDateString(locale, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'numeric',
                    }),
                  })}
                </p>
              )}
              {(existingQueueItem?.coupons_used ?? 0) > 0 && (
                <div className="text-blue-600 text-center mt-2 text-sm">
                  <span className="font-semibold">{t('queue.couponsUsedLabel')}</span>{' '}
                  {reservedCoupons.length > 0
                    ? reservedCoupons.map((coupon) => formatCouponLabel(coupon)).join(', ')
                    : existingQueueItem?.coupons_used}
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
