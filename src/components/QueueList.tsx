"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { useUi } from '@/contexts/UiContext';
import { QueueStatus } from '@/types';
import { sendTelegramNotification } from '@/lib/telegram';
import { useState, useEffect, useRef } from 'react';
import Timer from './Timer';
import QueueTimers from './QueueTimers';
import { CalendarIcon, BellIcon, KeyIcon, WashingIcon, BellOffIcon, WaitIcon, CheckIcon, DeleteIcon, EditIcon, TicketIcon, MoneyIcon, HourglassIcon, CloseIcon, ChevronUpIcon, ChevronDownIcon, WashingSpinner } from '@/components/Icons';
import Avatar from '@/components/Avatar';

export default function QueueList() {
  const { 
    queue, 
    user, 
    leaveQueue, 
    updateQueueItem, 
    setQueueStatus,
    fetchQueue,
    removeFromQueue,
    startWashing,
    cancelWashing,
    markDone,
    isAdmin,
    isSuperAdmin,
    students,
    machineState,
    transferSelectedToDate,
    transferSelectedToToday,  
    changeQueuePosition, 
    updateQueueEndTime,
    updateQueueItemDetails,
    optimisticUpdateQueueItem,
    banStudent,
    unbanStudent,
    clearQueue,
  } = useLaundry();
  const { t, language } = useUi();
  const locale = language === "ru" ? "ru-RU" : language === "en" ? "en-US" : language === "ko" ? "ko-KR" : "ky-KG";

  const [tempTimes, setTempTimes] = useState<{ [key: string]: string }>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const setTempTime = (id: string, time: string) => {
    setTempTimes(prev => ({ ...prev, [id]: time }));
  };
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editWashCount, setEditWashCount] = useState(1);
  const [editCouponsUsed, setEditCouponsUsed] = useState(0);
  const [editDate, setEditDate] = useState('');
  const [openActionFor, setOpenActionFor] = useState<string | null>(null);
  const [leavingQueueId, setLeavingQueueId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const actionMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!editingItem) return;
    setEditWashCount(editingItem.wash_count || 1);
    setEditCouponsUsed(editingItem.coupons_used || 0);
    setEditDate(editingItem.queue_date || '');
  }, [editingItem]);

  useEffect(() => {
    setEditCouponsUsed((prev) => Math.min(prev, editWashCount));
  }, [editWashCount]);

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const alertWithCheck = (message: string) => {
    const trimmed = message.trim();
    const suffix = trimmed.endsWith("✅") ? "" : " ✅";
    alert(`${message}${suffix}`);
  };

  const showActionError = (error: unknown, fallback: string) => {
    const message =
      error instanceof Error ? error.message : String(error ?? "").trim();
    alertWithCheck(message || fallback);
  };

  // Функция для переключения статуса потери ключа

  // Функция сохранения изменений:
  const handleSaveEdit = async () => {
    if (!editingItem) return;
  
    if (!isAdmin) {
      alertWithCheck(t("queue.error.onlyAdmin"));
      return;
    }
  
    await updateQueueItemDetails(editingItem.id, {
      wash_count: editWashCount,
      coupons_used: editCouponsUsed,
      chosen_date: editDate,
    });
  
    setShowEditModal(false);
    setEditingItem(null);
  };

  // ✅ Группировка по датам
  const groupQueueByDate = (items: any[]) => {
    const groups: { [key: string]: any[] } = {};
    
    items.forEach(item => {
      const date = item.queue_date || new Date().toISOString().slice(0, 10);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    
    return groups;
  };

  // ✅ Форматирование даты для заголовка
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const itemDate = new Date(`${dateStr}T00:00:00`);
    itemDate.setHours(0, 0, 0, 0);

    const dayLabel = date.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "numeric",
    });

    if (itemDate.getTime() === today.getTime()) {
      return `${t("queue.dateToday")}, ${dayLabel}`;
    }

    if (itemDate.getTime() === tomorrow.getTime()) {
      return `${t("queue.dateTomorrow")}, ${dayLabel}`;
    }

    return dayLabel;
  };

  // Добавь эту функцию в начало компонента QueueList:
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayLabel = date.toLocaleDateString(locale, {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });

      let label = dayLabel;
      if (i === 0) label += ` (${t("queue.dateToday")})`;
      if (i === 1) label += ` (${t("queue.dateTomorrow")})`;

      dates.push({ value: dateStr, label });
    }

    return dates;
  };
    // Функция для получения цвета и текста статуса с SVG иконками
    const getStatusDisplay = (status: QueueStatus, item?: any) => {
      switch(status) {
        case QueueStatus.WAITING:
          return { 
            bg: 'bg-slate-50 dark:bg-slate-700', 
            text: 'text-slate-700 dark:text-slate-200', 
            badge: (
              <span className="flex items-center gap-1.5">
                <HourglassIcon className="w-4 h-4" />
                {t("queue.status.waiting")}
              </span>
            ), 
            badgeColor: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white font-semibold shadow-sm dark:from-slate-600/40 dark:to-slate-500/20 dark:text-slate-200' 
          };
        case QueueStatus.READY:
          return { 
            bg: 'bg-yellow-50 dark:bg-amber-900/15', 
            text: 'text-yellow-900 dark:text-amber-200', 
            badge: (
              <span className="flex items-center gap-1.5">
                <HourglassIcon className="w-4 h-4" />
                {t("queue.status.ready").toUpperCase()}
              </span>
            ), 
            badgeColor: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold shadow-md dark:from-amber-600/40 dark:to-amber-500/20 dark:text-amber-200' 
          };
        case QueueStatus.KEY_ISSUED:
          return {
            bg: 'bg-blue-50 dark:bg-blue-950/40',
            text: 'text-blue-900 dark:text-blue-100',
            badge: (
              <span className="flex items-center gap-1.5">
                <KeyIcon className="w-4 h-4" />
                {t("queue.status.keyIssued")}
              </span>
            ),
            badgeColor: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-md dark:from-blue-500/70 dark:to-blue-400/40 dark:text-blue-100'
          };
        case QueueStatus.WASHING:
          return { 
            bg: 'bg-emerald-50 dark:bg-slate-800', 
            text: 'text-slate-900 dark:text-slate-100', 
            badge: (
              <span className="flex items-center gap-1.5">
                <WashingIcon className="w-4 h-4" />
                {t("queue.status.washing").toUpperCase()}
              </span>
            ), 
            badgeColor: 'bg-emerald-100 text-emerald-900 font-bold shadow-sm border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-500/30'
          };
        case QueueStatus.RETURNING_KEY:
          return { 
            bg: 'bg-orange-50 dark:bg-amber-900/10', 
            text: 'text-orange-900 dark:text-amber-200', 
            badge: (
              <span className="flex items-center gap-1.5">
                <KeyIcon className="w-4 h-4" />
                {t("queue.status.returning").toUpperCase()}
              </span>
            ), 
            badgeColor: 'bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold shadow-md dark:from-orange-600/40 dark:to-orange-500/20 dark:text-orange-200' 
          };
        case QueueStatus.DONE:
          return { 
            bg: 'bg-white dark:bg-slate-800', 
            text: 'text-slate-900 dark:text-slate-100', 
            badge: (
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4" />
                {t("queue.status.done").toUpperCase()}
              </span>
            ), 
            badgeColor: 'bg-emerald-100 text-emerald-900 font-bold shadow-sm border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-500/30'
          };
        default:
          return { 
            bg: 'bg-white dark:bg-slate-800', 
            text: 'text-gray-700 dark:text-slate-200', 
            badge: status, 
            badgeColor: 'bg-gray-200' 
          };
      }
    };
  
  // Queue items including washing and done
  const queuedItems = queue.filter((item: any) =>  
    item.status === QueueStatus.WAITING || 
    item.status === QueueStatus.READY || 
    item.status === QueueStatus.KEY_ISSUED || 
    item.status === QueueStatus.WASHING || 
    item.status === QueueStatus.RETURNING_KEY || 
    item.status === QueueStatus.DONE
  );

  // ✅ Группируем очередь по датам
  const groupedQueue = groupQueueByDate(queuedItems);
  const sortedDates = Object.keys(groupedQueue).sort();

  if (queuedItems.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><CalendarIcon className="w-6 h-6" />{t("queue.title")}</h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">{t("queue.empty")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
          <CalendarIcon className="w-5 h-5 inline-block mr-1" />{t("queue.title")} ({queuedItems.length})
        </h2>
        {isSuperAdmin && queuedItems.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="btn btn-danger px-3 py-1.5 text-sm shadow-md hover:shadow-lg active:scale-95"
            title={t("queue.clear")}
          >
            <DeleteIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t("queue.clear")}</span>
          </button>
        )}
      </div>
      
      {/* ✅ Кнопки переноса для админа - вынесены из header */}
      {/* DEBUG: isAdmin={String(isAdmin)}, selectedItems.length={selectedItems.length} */}
      {isAdmin && selectedItems.length > 0 && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-3 m-3 dark:bg-blue-950/30 dark:border-blue-500/30">
          <h4 className="font-bold text-slate-900 mb-2 text-sm dark:text-blue-200">
            <CalendarIcon className="w-4 h-4 inline-block mr-1" />
            {t("queue.moveSelected", { count: selectedItems.length })}
          </h4>
  
          <div className="grid grid-cols-3 gap-2">
            {/* Назад */}
            <button
              onClick={async () => {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() - 1);
                const dateStr = targetDate.toISOString().slice(0, 10);
                await transferSelectedToDate(selectedItems, dateStr);
                setSelectedItems([]);
              }}
              className="btn bg-red-500 text-white hover:bg-red-600 px-2 py-2 text-xs dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30 dark:border dark:border-rose-500/40"
            >
              {t("queue.movePrev")}
            </button>
    
            {/* Сегодня */}
            <button
              onClick={async () => {
                await transferSelectedToToday(selectedItems);
                setSelectedItems([]);
              }}
              className="btn bg-green-500 text-white hover:bg-green-600 px-2 py-2 text-xs dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/30 dark:border dark:border-emerald-500/40"
            >
              {t("queue.moveToday")}
            </button>
    
            {/* Вперед */}
            <button
              onClick={async () => {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + 1);
                const dateStr = targetDate.toISOString().slice(0, 10);
                await transferSelectedToDate(selectedItems, dateStr);
                setSelectedItems([]);
              }}
              className="btn bg-blue-500 text-white hover:bg-blue-600 px-2 py-2 text-xs dark:bg-blue-500/20 dark:text-blue-100 dark:hover:bg-blue-500/30 dark:border dark:border-blue-500/40"
            >
              {t("queue.moveNext")}
            </button>
          </div>
  
          {/* Отмена выбора */}
          <button
            onClick={() => setSelectedItems([])}
            className="w-full btn btn-neutral text-xs dark:bg-slate-900/40 dark:text-slate-200 dark:border dark:border-slate-700 dark:hover:bg-slate-900/55"
          >
            <CloseIcon className="w-4 h-4" />
            {t("queue.moveCancel")}
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        {sortedDates.map(dateKey => (
          <div key={dateKey} className="border-t-4 border-slate-200 pt-2 px-2 dark:border-slate-700">
            {/* ✅ Заголовок даты */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 sticky top-0 bg-white dark:bg-slate-800 z-10 py-1">
              {formatDateHeader(dateKey)}
            </h3>
            
            {/* ✅ Список записей на эту дату */}
            <div className="space-y-3">
            {groupedQueue[dateKey].map((item: any, index: number) => {
                const isCurrentUser = user && item.student_id === user.student_id;
                const isSelfQueueItem = !!isCurrentUser;
                const statusDisplay = getStatusDisplay(item.status, item);
                const globalIndex = queuedItems.findIndex((q: any) => q.id === item.id);
                // Найти студента по item.student_id и проверить is_super_admin
                const targetStudent = students.find(s => s.id === item.student_id);
                const targetIsSuperAdmin = targetStudent?.is_super_admin === true;
                const displayName = item.full_name || targetStudent?.full_name || "-";
                const displayRoom = item.room || targetStudent?.room;
                const couponsUsed = item.coupons_used || 0;

                // ✅ Определяем цвет левой рамки по активному таймеру
                let leftBorderColor = 'border-l-slate-300 dark:border-l-slate-600';
                if (item.return_requested_at && !item.finished_at) {
                  leftBorderColor = 'border-l-orange-400 dark:border-l-orange-500/50';
                } else if (item.washing_started_at && !item.washing_finished_at && !item.return_requested_at) {
                  leftBorderColor = 'border-l-emerald-500 dark:border-l-emerald-500/50';
                } else if (item.key_issued_at && !item.washing_started_at) {
                  leftBorderColor = 'border-l-blue-400 dark:border-l-blue-400/60';
                } else if (item.ready_at && !item.key_issued_at) {
                  leftBorderColor = 'border-l-yellow-400 dark:border-l-amber-500/50';
                } else if (item.status === QueueStatus.DONE) {
                  leftBorderColor = 'border-l-emerald-600 dark:border-l-emerald-500/60';
                }
                
                if (isCurrentUser) leftBorderColor = 'border-l-blue-600 dark:border-l-blue-400';
                
                return (
                  <div key={item.id} className={`${statusDisplay.bg} border border-slate-200 dark:border-slate-700 border-l-4 ${leftBorderColor} rounded-lg p-3 shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={item.full_name} style={item.avatar_style} seed={item.avatar_seed} className="w-12 h-12" />
                        <div>
                          <div className="font-bold text-lg text-gray-900 dark:text-slate-100">{displayName}</div>
                          {displayRoom && <div className="text-xs text-gray-600 dark:text-slate-300">{t("queue.label.room")} {displayRoom}</div>}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusDisplay.badgeColor} whitespace-nowrap`}>
                        {statusDisplay.badge}
                      </span>
                    </div>

                    {/* Заголовок с кнопками управления */}
                    {/* Чекбокс для выбора и кнопки перемещения */}
                    {isAdmin && (
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-slate-900 dark:ring-offset-slate-900"
                        />
                        <div className="flex gap-1 ml-auto">
                          <button
                            onClick={() => changeQueuePosition(item.id, 'up')}
                            disabled={index === 0}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                            title={t("queue.action.moveUp")}
                          >
                            <ChevronUpIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => changeQueuePosition(item.id, 'down')}
                            disabled={index === groupedQueue[dateKey].length - 1}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                            title={t("queue.action.moveDown")}
                          >
                            <ChevronDownIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* ✅ Таймеры - последний активный сверху */}
                    {(item.ready_at || item.key_issued_at || item.washing_started_at || item.return_requested_at) && (
                      <div className="flex flex-col gap-2 mb-2">
                          {item.return_requested_at && (
                            <Timer 
                              startTime={item.return_requested_at} 
                              endTime={item.finished_at || undefined}
                              label={t("queue.timer.returning")} 
                              color="orange" 
                            />
                          )}
                          {item.washing_started_at && (
                            <Timer 
                              startTime={item.washing_started_at} 
                              endTime={
                                item.washing_finished_at ||
                                item.return_requested_at ||
                                item.finished_at ||
                                undefined
                              }
                              label={t("queue.timer.washing")} 
                              color="green" 
                              multiplier={item.wash_count || 1}
                            />
                          )}
                          {item.key_issued_at && (
                            <Timer 
                              startTime={item.key_issued_at} 
                              endTime={item.washing_started_at || undefined}
                              label={t("queue.timer.keyIssued")} 
                              color="blue" 
                            />
                          )}
                          {item.ready_at && (
                            <Timer 
                              startTime={item.ready_at} 
                              endTime={item.key_issued_at || undefined}
                              label={t("queue.timer.ready")} 
                              color="yellow" 
                            />
                          )}
                      </div>
                    )}
                    
                    {/* Инфо - компактная сетка */}
                    <div className="grid grid-cols-3 gap-2 mb-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">{t("queue.label.washCount")}</span>
                        <span className="text-lg font-bold text-blue-700">{item.wash_count || 1}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">{t("queue.label.payment")}</span>
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                          {couponsUsed > 0 || item.payment_type === 'coupon' || item.payment_type === 'both' ? (
                            <>
                              <TicketIcon className="w-4 h-4 text-purple-600" />
                              <span>
                                {couponsUsed > 0
                                  ? t("payment.coupons", { count: couponsUsed })
                                  : t("payment.coupon")}
                              </span>
                              {item.payment_type === 'both' && (
                                <>
                                  <span>+</span>
                                  <MoneyIcon className="w-4 h-4 text-green-600" />
                                  <span>{t("payment.money")}</span>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <MoneyIcon className="w-4 h-4 text-green-600" />
                              <span>{t("payment.money")}</span>
                            </>
                          )}
                        </span>
                      </div>
                      {/* Время */}
                      {item.status === QueueStatus.DONE && item.finished_at ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600">{t("queue.label.finished")}</span>
                          <span className="text-lg font-bold text-emerald-700">
                            {(() => {
                              const date = new Date(item.finished_at);
                              const hours = date.getHours().toString().padStart(2, '0');
                              const minutes = date.getMinutes().toString().padStart(2, '0');
                              return `${hours}:${minutes}`;
                            })()}
                          </span>
                        </div>
                      ) : item.expected_finish_at ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600">{t("queue.label.finishes")}</span>
                          <span className="text-lg font-bold text-blue-700">
                            {(() => {
                              const date = new Date(item.expected_finish_at);
                              const hours = date.getHours().toString().padStart(2, '0');
                              const minutes = date.getMinutes().toString().padStart(2, '0');
                              return `${hours}:${minutes}`;
                            })()}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    
                    {/* Действия */}
                    <div>
                      <div className="flex flex-col gap-2">
                        {/* Сообщение от админа */}
                        {item.admin_message && (
                          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded dark:bg-amber-900/30 dark:border-amber-500/40">
                            <p className="font-bold text-yellow-800 dark:text-amber-200">{t("queue.label.adminMessage")}: {item.admin_message}</p>
                          </div>
                        )}
                        
                        {/* Кнопки пользователя */}
                        {isCurrentUser &&
                          (item.status === QueueStatus.WAITING ||
                            item.status === QueueStatus.READY ||
                            item.status === QueueStatus.KEY_ISSUED) && (
                          <button
                            onClick={async () => {
                              if (leavingQueueId) return;
                              setLeavingQueueId(item.id);
                              try {
                                await leaveQueue(item.id);
                              } catch (error) {
                                showActionError(error, t("queue.submitError"));
                              } finally {
                                setLeavingQueueId(null);
                              }
                            }}
                            disabled={leavingQueueId === item.id}
                            className="w-full btn btn-danger disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {leavingQueueId === item.id ? (
                              <>
                                <WashingSpinner className="w-4 h-4" />
                                <span>{t("queue.leave")}...</span>
                              </>
                            ) : (
                              <>
                                <CloseIcon className="w-4 h-4" />
                                {t("queue.leave")}
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Кнопки админа */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              const newOpenId = openActionFor === item.id ? null : item.id;
                              setOpenActionFor(newOpenId);
                              
                              // Скроллим к меню действий после небольшой задержки
                              if (newOpenId) {
                                setTimeout(() => {
                                  actionMenuRefs.current[item.id]?.scrollIntoView({ 
                                    behavior: 'smooth', 
                                    block: 'nearest' 
                                  });
                                }, 100);
                              }
                            }}
                            className="w-full btn btn-secondary mt-2"
                          >
                            <EditIcon className="w-4 h-4" /> {t("queue.action.actions")}
                          </button>
                        )}
                        {isAdmin && (targetIsSuperAdmin ? isSuperAdmin : true) && openActionFor === item.id && (
                          <div 
                            ref={(el) => { actionMenuRefs.current[item.id] = el; }}
                            className="mt-3 bg-gray-50 border rounded-lg shadow-inner p-3 space-y-2 dark:bg-slate-900/40 dark:border-slate-700"
                          >

                          {/* Позвать */}
                          <button
                            className="w-full btn bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:text-white dark:hover:bg-orange-700"
                            onClick={async () => {
                              try {
                                if (isSelfQueueItem) {
                                  alertWithCheck(t("queue.error.callSelf"));
                                  return;
                                }
                                const now = new Date().toISOString();
                                await updateQueueItem(
                                  item.id,
                                  {
                                  admin_room: user?.room,
                                  ready_at: now,
                                  },
                                  { skipFetch: true }
                                );
                                await setQueueStatus(item.id, QueueStatus.READY, { skipFetch: true });
                                void sendTelegramNotification({
                                  type: 'admin_call_for_key',
                                  full_name: item.full_name,
                                  student_id: item.student_id,
                                  admin_student_id: user?.student_id,
                                  expected_finish_at: item.expected_finish_at,
                                }).catch((err) => console.error('sendTelegramNotification(admin_call_for_key) error:', err));
                                await fetchQueue();
                              } catch (error) {
                                showActionError(error, t("queue.error.callFail"));
                                console.error('❌ Error in Позвать:', error);
                              }
                            }}
                            disabled={isSelfQueueItem}
                          >
                            <BellIcon className="w-4 h-4" /> {t("queue.action.call")}
                          </button>

                          {/* Выдать ключ */}
                          <button
                            className="w-full btn bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                            onClick={async () => {
                              try {
                                const now = new Date().toISOString();
                                await updateQueueItem(item.id, { key_issued_at: now }, { skipFetch: true });
                                await setQueueStatus(item.id, QueueStatus.KEY_ISSUED, { skipFetch: true });
                                void sendTelegramNotification({
                                  type: 'admin_key_issued',
                                  full_name: item.full_name,
                                  room: item.room,
                                  student_id: item.student_id,
                                }).catch((err) => console.error('sendTelegramNotification(admin_key_issued) error:', err));
                                await fetchQueue();
                              } catch (error) {
                                showActionError(error, t("queue.error.issueFail"));
                                console.error('❌ Error in Выдать ключ:', error);
                              }
                            }}
                          >
                            <KeyIcon className="w-4 h-4" /> {t("queue.action.issueKey")}
                          </button>

                          {/* Стирать */}
                          <button
                            className="w-full btn bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700"
                            onClick={async () => {
                              try {
                                // Запускаем стирку (меняет статус)
                                await startWashing(item.id);
                                
                                // ✅ Отправляем уведомление студенту что админ запустил стирку
                                void sendTelegramNotification({
                                  type: 'washing_started',
                                  full_name: item.full_name,
                                  room: item.room,
                                  student_id: item.student_id,
                                  wash_count: item.wash_count,
                                }).catch((err) => console.error('sendTelegramNotification(washing_started) error:', err));
                              } catch (error) {
                                showActionError(error, t("queue.error.startFail"));
                                console.error('❌ Error in Стирать:', error);
                              }
                            }}
                          >
                            <WashingIcon className="w-4 h-4" /> {t("queue.action.startWash")}
                          </button>

                          {/* Вернуть ключ */}
                          <button
                            className="w-full btn bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:text-white dark:hover:bg-orange-700"
                            onClick={async () => {
                              try {
                                if (isSelfQueueItem) {
                                  alertWithCheck(t("queue.error.returnSelf"));
                                  return;
                                }
                                const now = new Date().toISOString();
                                await updateQueueItem(
                                  item.id,
                                  {
                                  return_key_alert: true,
                                  admin_room: user?.room,
                                  return_requested_at: now,
                                  },
                                  { skipFetch: true }
                                );
                                await setQueueStatus(item.id, QueueStatus.RETURNING_KEY, { skipFetch: true });
                                void sendTelegramNotification({
                                  type: "admin_return_key",
                                  full_name: item.full_name,
                                  student_id: item.student_id,
                                  admin_student_id: user?.student_id,
                                }).catch((err) => console.error('sendTelegramNotification(admin_return_key) error:', err));
                                await fetchQueue();
                              } catch (error) {
                                showActionError(error, t("queue.error.returnFail"));
                                console.error('? Error in Вернуть ключ:', error);
                              }
                            }}
                            disabled={isSelfQueueItem}
                          >
                            <BellIcon className="w-4 h-4" /> {t("queue.action.returnKey")}
                          </button>

                          {/* Завершить */}
                          <button
                            className="w-full btn bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700"
                            onClick={async () => {
                              try {
                                await markDone(item.id);
                              } catch (error) {
                                showActionError(error, t("queue.error.finishFail"));
                                console.error('❌ Error in Завершить:', error);
                              }
                            }}
                          >
                            <CheckIcon className="w-4 h-4" /> {t("queue.action.finish")}
                          </button>

                          {/* В ожидание - сбрасывает все timestamps */}
                          <button
                            className="w-full btn bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500/20 dark:text-purple-200 dark:hover:bg-purple-500/30 dark:border dark:border-purple-500/40"
                            onClick={async () => {
                              await updateQueueItem(
                                item.id,
                                {
                                  ready_at: null,
                                  key_issued_at: null,
                                  washing_started_at: null,
                                  return_requested_at: null,
                                  admin_room: null,
                                  return_key_alert: false,
                                },
                                { skipFetch: true }
                              );
                              await setQueueStatus(item.id, QueueStatus.WAITING, { skipFetch: true });
                              await fetchQueue();
                            }}
                          >
                            <WaitIcon className="w-4 h-4" /> {t("queue.action.reset")}
                          </button>

                          {/* Удалить */}
                          <button
                            className="w-full btn btn-danger"
                            onClick={async () => {
                              if (confirm(t("common.deleteConfirm", { name: item.full_name }))) {
                                await removeFromQueue(item.id);
                              }
                            }}
                          >
                            <DeleteIcon className="w-4 h-4" /> {t("queue.action.remove")}
                          </button>

                          <button
                            onClick={() => setOpenActionFor(null)}
                            className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            {t("queue.action.hideMenu")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>         
          </div>
        ))}
      </div>
      {/* Модальное окно редактирования */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><EditIcon className="w-5 h-5" />{t("queue.action.editTitle")}</h3>
            <p className="text-gray-700 mb-3">
              {t("queue.action.editStudent")}: <span className="font-bold">{editingItem.full_name}</span>
            </p>
            
            <div className="space-y-3">
              {/* Дата стирки */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900 flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {t("queue.action.editDate")}
                </label>
          <select
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
          >
            {getAvailableDates().map(date => (
              <option key={date.value} value={date.value}>
                {date.label}
              </option>
            ))}
          </select>
        </div>

        {/* Количество стирок */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-900">{t("queue.action.editWashCount")}</label>
          <select
            value={editWashCount}
            onChange={(e) => setEditWashCount(Number(e.target.value))}
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 font-semibold bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        {/* Купоны */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-900">{t("queue.action.editCoupons")}</label>
          <select
            value={editCouponsUsed}
            onChange={(e) => setEditCouponsUsed(Number(e.target.value))}
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
          >
            {Array.from({ length: editWashCount + 1 }, (_, i) => i).map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setShowEditModal(false)}
          className="flex-1 btn btn-neutral"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={handleSaveEdit}
          className="flex-1 btn btn-primary"
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  </div>
)}

{/* Модальное окно подтверждения очистки очереди */}
{showClearConfirm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-2xl">
      <h3 className="text-xl font-bold text-gray-900 mb-4">{t("queue.clearTitle")}</h3>
      <p className="text-gray-700 mb-6">{t("queue.clearConfirm")}</p>
      <div className="flex gap-3">
        <button
          onClick={() => setShowClearConfirm(false)}
          className="flex-1 btn btn-neutral"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={async () => {
            try {
              await clearQueue();
              setShowClearConfirm(false);
              alertWithCheck(t("queue.clearSuccess"));
            } catch (err: any) {
              alertWithCheck(t("queue.clearError", { message: err?.message || "" }));
            }
          }}
          className="flex-1 btn btn-danger"
        >
          {t("queue.clear")}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}







