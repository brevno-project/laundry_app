"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { supabase } from '@/lib/supabase';
import { CalendarIcon, MoneyIcon, TicketIcon } from '@/components/Icons';

type CouponOption = {
  id: string;
  issued_at: string;
  expires_at: string;
};

const PERMANENT_COUPON_YEARS = 5;

const formatCouponDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const isPermanentCoupon = (coupon: CouponOption) => {
  const expiresAt = new Date(coupon.expires_at).getTime();
  if (Number.isNaN(expiresAt)) return false;
  const issuedAt = new Date(coupon.issued_at).getTime();
  const baseTime = Number.isNaN(issuedAt) ? Date.now() : issuedAt;
  const thresholdMs = PERMANENT_COUPON_YEARS * 365 * 24 * 60 * 60 * 1000;
  return expiresAt - baseTime >= thresholdMs;
};

const formatCouponLabel = (coupon: CouponOption) =>
  isPermanentCoupon(coupon) ? 'Бессрочный' : `До ${formatCouponDateTime(coupon.expires_at)}`;

export default function UserForm() {
  const { user, joinQueue, getUserQueueItem, queue } = useLaundry();
  const [washCount, setWashCount] = useState<number>(1);
  const [eligibleCoupons, setEligibleCoupons] = useState<CouponOption[]>([]);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);
  const [reservedCoupons, setReservedCoupons] = useState<CouponOption[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<number>(0);
  const [activeCoupons, setActiveCoupons] = useState<number>(0);
  const [couponNotice, setCouponNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(''); // 
  
  const existingQueueItem = getUserQueueItem();
  const isInQueue = !!existingQueueItem;
  
  const queuePosition = existingQueueItem ? queue.findIndex(item => item.id === existingQueueItem.id) + 1 : 0;
  const maxCoupons = Math.min(availableCoupons, washCount);
  const selectedCouponCount = selectedCouponIds.length;

  // ✅ Устанавливаем сегодняшнюю дату по умолчанию
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDate(today);
  }, []);

  // ✅ Генерируем доступные даты (сегодня + 7 дней вперед)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      
      // Форматируем дату для отображения
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const dayName = dayNames[date.getDay()];
      const day = date.getDate();
      const month = date.getMonth() + 1;
      
      let label = `${dayName}, ${day}.${month.toString().padStart(2, '0')}`;
      if (i === 0) label += ' (Сегодня)';
      if (i === 1) label += ' (Завтра)';
      
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
        ? 'Купоны недоступны на выбранную дату.'
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
      
      // ✅ Передаем выбранную дату в joinQueue (без expectedFinishAt)
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
        alert(error?.message || 'Не удалось встать в очередь');
      }
      
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    }
  };

  return (
    <div className="space-y-4">
      
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Встать в очередь</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-bold mb-2 text-gray-700">
              Имя
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
              Комната
            </label>
            <input
              id="room"
              type="text"
              value={user?.room || 'Не указана'}
              readOnly
              className="mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm p-3 text-gray-700 cursor-not-allowed"
            />
          </div>

          {!isInQueue ? (
            <>
              {/* ✅ НОВОЕ ПОЛЕ: Выбор даты */}
              <div className="mb-4">
                <label htmlFor="selectedDate" className="block text-sm font-bold mb-2 text-gray-700">
                  Выберите дату стирки
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
                <p className="text-xs text-gray-500 mt-1">Вы можете записаться на любой день из списка</p>
              </div>

              <div className="mb-4">
                <label htmlFor="washCount" className="block text-sm font-bold mb-2 text-gray-700">
                  Количество стирок
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
                  Купоны
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Доступно на выбранную дату: {availableCoupons} (активных: {activeCoupons})
                </p>
                {couponNotice && (
                  <p className="text-xs text-red-500 mb-2">{couponNotice}</p>
                )}
                {eligibleCoupons.length === 0 ? (
                  <p className="text-xs text-gray-500">Нет доступных купонов.</p>
                ) : (
                  <div className="space-y-2">
                    {eligibleCoupons.map((coupon) => {
                      const isSelected = selectedCouponIds.includes(coupon.id);
                      const isLimitReached =
                        !isSelected && selectedCouponIds.length >= maxCoupons;
                      return (
                        <label
                          key={coupon.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
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
                    Можно выбрать до {maxCoupons} купонов.
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  {selectedCouponCount > 0 ? (
                    <>
                      <TicketIcon className="w-4 h-4 text-purple-600" />
                      {selectedCouponCount >= washCount ? 'Оплата купонами' : 'Купоны + деньги'}
                    </>
                  ) : (
                    <>
                      <MoneyIcon className="w-4 h-4 text-green-600" />
                      Оплата деньгами
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>Добавление...</>
                ) : (
                  <><CalendarIcon className="w-5 h-5" />Встать в очередь</>
                )}
              </button>
            </>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-md p-4">
              <p className="text-blue-800 font-bold text-center text-lg">
                Вы в очереди!
              </p>
              <p className="text-blue-600 font-black text-center mt-2 text-3xl">
                Позиция #{queuePosition}
              </p>
              {/* ✅ Показываем дату записи */}
              {existingQueueItem?.scheduled_for_date && (
                <p className="text-blue-600 text-center mt-2">
                  Записаны на: {new Date(existingQueueItem.scheduled_for_date).toLocaleDateString('ru-RU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric'
                  })}
                </p>
              )}
              {(existingQueueItem?.coupons_used ?? 0) > 0 && (
                <div className="text-blue-600 text-center mt-2 text-sm">
                  <span className="font-semibold">Купоны:</span>{' '}
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
