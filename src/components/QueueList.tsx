"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { useUi } from '@/contexts/UiContext';
import { QueueStatus } from '@/types';
import { sendTelegramNotification } from '@/lib/telegram';
import { useState, useEffect, useRef } from 'react';
import Timer from './Timer';
import QueueTimers from './QueueTimers';
import { CalendarIcon, BellIcon, KeyIcon, WashingIcon, BellOffIcon, WaitIcon, CheckIcon, DeleteIcon, EditIcon, TicketIcon, MoneyIcon, HourglassIcon, CloseIcon, ChevronUpIcon, ChevronDownIcon } from '@/components/Icons';
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
  const queueCopy = {
    ru: {
      title: "Очередь",
      empty: "Никого нет в очереди.",
      clear: "Очистить",
      clearTitle: "Подтверждение",
      clearConfirm: "Вы уверены, что хотите очистить всю очередь? Это действие нельзя отменить!",
      clearSuccess: "Очередь очищена ✅",
      clearError: "Ошибка: {{message}} ✅",
      moveSelected: "Перенести выбранных ({{count}})",
      movePrev: "Назад",
      moveToday: "Сегодня",
      moveNext: "Вперед",
      moveCancel: "Отменить выбор",
      status: {
        waiting: "Ожидание",
        ready: "За ключом",
        keyIssued: "Ключ выдан",
        washing: "Стирка",
        returning: "Возврат ключа",
        done: "Завершено",
      },
      timers: {
        returning: "Возвращает ключ",
        washing: "Стирает",
        keyIssued: "Ключ выдан",
        ready: "Идет за ключом",
      },
      labels: {
        room: "Комната",
        payment: "Оплата",
        washCount: "Стирок",
        finished: "Закончил",
        finishes: "Закончит",
        adminMessage: "Сообщение от админа",
      },
      actions: {
        actions: "Действия",
        call: "Позвать",
        issueKey: "Выдать ключ",
        startWash: "Стирать",
        returnKey: "Вернуть ключ",
        finish: "Завершить",
        reset: "В ожидание",
        remove: "Удалить",
        hideMenu: "Скрыть меню",
        moveUp: "Переместить вверх",
        moveDown: "Переместить вниз",
        editTitle: "Редактировать запись",
        editStudent: "Студент",
        editDate: "Дата стирки",
        editWashCount: "Количество стирок",
        editCoupons: "Купоны",
      },
      errors: {
        onlyAdmin: "Только администратор может редактировать записи",
        callSelf: "Нельзя вызвать себя за ключом.",
        returnSelf: "Нельзя вызвать себя на возврат ключа.",
        callFail: "Не удалось вызвать",
        issueFail: "Не удалось выдать ключ",
        startFail: "Не удалось начать стирку",
        returnFail: "Не удалось вызвать на возврат",
        finishFail: "Не удалось завершить",
      },
    },
    ky: {
      title: "Кезек",
      empty: "Кезекте эч ким жок.",
      clear: "Тазалоо",
      clearTitle: "Ырастоо",
      clearConfirm: "Бүт кезекти тазалагыңыз келеби? Бул аракетти артка кайтарууга болбойт!",
      clearSuccess: "Кезек тазаланды ✅",
      clearError: "Ката: {{message}} ✅",
      moveSelected: "Тандалгандарды көчүрүү ({{count}})",
      movePrev: "Артка",
      moveToday: "Бүгүн",
      moveNext: "Алга",
      moveCancel: "Тандоону жокко чыгаруу",
      status: {
        waiting: "Күтүү",
        ready: "Ачкычка",
        keyIssued: "Ачкыч берилди",
        washing: "Жуу",
        returning: "Ачкычты кайтаруу",
        done: "Аякталды",
      },
      timers: {
        returning: "Ачкычты кайтарып жатат",
        washing: "Жууп жатат",
        keyIssued: "Ачкыч берилди",
        ready: "Ачкычка бара жатат",
      },
      labels: {
        room: "Бөлмө",
        payment: "Төлөм",
        washCount: "Жуулган",
        finished: "Аяктады",
        finishes: "Аяктайт",
        adminMessage: "Админдин билдирүүсү",
      },
      actions: {
        actions: "Аракеттер",
        call: "Чакыруу",
        issueKey: "Ачкыч берүү",
        startWash: "Жуу баштоо",
        returnKey: "Кайтарууну сураныч",
        finish: "Аяктоо",
        reset: "Күтүүгө",
        remove: "Өчүрүү",
        hideMenu: "Менюну жашыруу",
        moveUp: "Жогору жылдыруу",
        moveDown: "Төмөн жылдыруу",
        editTitle: "Жазууну оңдоо",
        editStudent: "Студент",
        editDate: "Кир жуу күнү",
        editWashCount: "Кир жуунун саны",
        editCoupons: "Купондор",
      },
      errors: {
        onlyAdmin: "Жазууларды админ гана түзөтө алат",
        callSelf: "Өзүңүздү ачкычка чакыра албайсыз.",
        returnSelf: "Өзүңүзгө ачкыч кайтарууну сурай албайсыз.",
        callFail: "Чакыруу мүмкүн болгон жок",
        issueFail: "Ачкыч берүү мүмкүн болгон жок",
        startFail: "Жууну баштоо мүмкүн болгон жок",
        returnFail: "Кайтарууну суроо мүмкүн болгон жок",
        finishFail: "Аяктоо мүмкүн болгон жок",
      },
    },
    en: {
      title: "Queue",
      empty: "No one is in the queue.",
      clear: "Clear",
      clearTitle: "Confirmation",
      clearConfirm: "Are you sure you want to clear the entire queue? This action cannot be undone!",
      clearSuccess: "Queue cleared ✅",
      clearError: "Error: {{message}} ✅",
      moveSelected: "Move selected ({{count}})",
      movePrev: "Back",
      moveToday: "Today",
      moveNext: "Forward",
      moveCancel: "Cancel selection",
      status: {
        waiting: "Waiting",
        ready: "Called for key",
        keyIssued: "Key issued",
        washing: "Washing",
        returning: "Return key",
        done: "Completed",
      },
      timers: {
        returning: "Returning key",
        washing: "Washing",
        keyIssued: "Key issued",
        ready: "Going for key",
      },
      labels: {
        room: "Room",
        payment: "Payment",
        washCount: "Washes",
        finished: "Finished",
        finishes: "Finishes",
        adminMessage: "Admin message",
      },
      actions: {
        actions: "Actions",
        call: "Call",
        issueKey: "Issue key",
        startWash: "Start washing",
        returnKey: "Request return",
        finish: "Finish",
        reset: "Back to waiting",
        remove: "Remove",
        hideMenu: "Hide menu",
        moveUp: "Move up",
        moveDown: "Move down",
        editTitle: "Edit entry",
        editStudent: "Student",
        editDate: "Wash date",
        editWashCount: "Wash count",
        editCoupons: "Coupons",
      },
      errors: {
        onlyAdmin: "Only an admin can edit entries",
        callSelf: "You can't call yourself for the key.",
        returnSelf: "You can't request your own key return.",
        callFail: "Failed to call",
        issueFail: "Failed to issue key",
        startFail: "Failed to start washing",
        returnFail: "Failed to request return",
        finishFail: "Failed to finish",
      },
    },
    ko: {
      title: "대기열",
      empty: "대기열에 아무도 없습니다.",
      clear: "비우기",
      clearTitle: "확인",
      clearConfirm: "전체 대기열을 비우시겠습니까? 이 동작은 되돌릴 수 없습니다!",
      clearSuccess: "대기열이 비워졌습니다 ✅",
      clearError: "오류: {{message}} ✅",
      moveSelected: "선택 항목 이동 ({{count}})",
      movePrev: "이전",
      moveToday: "오늘",
      moveNext: "다음",
      moveCancel: "선택 취소",
      status: {
        waiting: "대기",
        ready: "열쇠 받으러 감",
        keyIssued: "열쇠 발급",
        washing: "세탁",
        returning: "열쇠 반환",
        done: "완료",
      },
      timers: {
        returning: "열쇠 반환 중",
        washing: "세탁 중",
        keyIssued: "열쇠 발급",
        ready: "열쇠 받으러 감",
      },
      labels: {
        room: "방",
        payment: "결제",
        washCount: "세탁 횟수",
        finished: "완료 시간",
        finishes: "예정 종료",
        adminMessage: "관리자 메시지",
      },
      actions: {
        actions: "작업",
        call: "호출",
        issueKey: "열쇠 발급",
        startWash: "세탁 시작",
        returnKey: "열쇠 반환 요청",
        finish: "완료",
        reset: "대기 상태로",
        remove: "삭제",
        hideMenu: "메뉴 닫기",
        moveUp: "위로 이동",
        moveDown: "아래로 이동",
        editTitle: "기록 편집",
        editStudent: "학생",
        editDate: "세탁 날짜",
        editWashCount: "세탁 횟수",
        editCoupons: "쿠폰",
      },
      errors: {
        onlyAdmin: "관리자만 항목을 편집할 수 있습니다",
        callSelf: "본인을 열쇠 호출할 수 없습니다.",
        returnSelf: "본인에게 열쇠 반환 요청할 수 없습니다.",
        callFail: "호출 실패",
        issueFail: "열쇠 발급 실패",
        startFail: "세탁 시작 실패",
        returnFail: "반환 요청 실패",
        finishFail: "완료 실패",
      },
    },
  }[language] || {
    title: "Очередь",
    empty: "Никого нет в очереди.",
    clear: "Очистить",
    clearTitle: "Подтверждение",
    clearConfirm: "Вы уверены, что хотите очистить всю очередь? Это действие нельзя отменить!",
    clearSuccess: "Очередь очищена ✅",
    clearError: "Ошибка: {{message}} ✅",
    moveSelected: "Перенести выбранных ({{count}})",
    movePrev: "Назад",
    moveToday: "Сегодня",
    moveNext: "Вперед",
    moveCancel: "Отменить выбор",
    status: {
      waiting: "Ожидание",
      ready: "За ключом",
      keyIssued: "Ключ выдан",
      washing: "Стирка",
      returning: "Возврат ключа",
      done: "Завершено",
    },
    timers: {
      returning: "Возвращает ключ",
      washing: "Стирает",
      keyIssued: "Ключ выдан",
      ready: "Идет за ключом",
    },
    labels: {
      room: "Комната",
      payment: "Оплата",
      washCount: "Стирок",
      finished: "Закончил",
      finishes: "Закончит",
      adminMessage: "Сообщение от админа",
    },
    actions: {
      actions: "Действия",
      call: "Позвать",
      issueKey: "Выдать ключ",
      startWash: "Стирать",
      returnKey: "Вернуть ключ",
      finish: "Завершить",
      reset: "В ожидание",
      remove: "Удалить",
      hideMenu: "Скрыть меню",
      moveUp: "Переместить вверх",
      moveDown: "Переместить вниз",
      editTitle: "Редактировать запись",
      editStudent: "Студент",
      editDate: "Дата стирки",
      editWashCount: "Количество стирок",
      editCoupons: "Купоны",
    },
    errors: {
      onlyAdmin: "Только администратор может редактировать записи",
      callSelf: "Нельзя вызвать себя за ключом.",
      returnSelf: "Нельзя вызвать себя на возврат ключа.",
      callFail: "Не удалось вызвать",
      issueFail: "Не удалось выдать ключ",
      startFail: "Не удалось начать стирку",
      returnFail: "Не удалось вызвать на возврат",
      finishFail: "Не удалось завершить",
    },
  };
  
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
      alertWithCheck(queueCopy.errors.onlyAdmin);
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
                {queueCopy.status.waiting}
              </span>
            ), 
            badgeColor: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white font-semibold shadow-sm' 
          };
        case QueueStatus.READY:
          return { 
            bg: 'bg-yellow-50 dark:bg-slate-700', 
            text: 'text-yellow-900 dark:text-yellow-300', 
            badge: (
              <span className="flex items-center gap-1.5">
                <HourglassIcon className="w-4 h-4" />
                {queueCopy.status.ready.toUpperCase()}
              </span>
            ), 
            badgeColor: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold shadow-md' 
          };
        case QueueStatus.KEY_ISSUED:
          return {
            bg: 'bg-blue-50 dark:bg-slate-700',
            text: 'text-blue-900 dark:text-blue-300',
            badge: (
              <span className="flex items-center gap-1.5">
                <KeyIcon className="w-4 h-4" />
                {queueCopy.status.keyIssued}
              </span>
            ),
            badgeColor: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold shadow-md'
          };
        case QueueStatus.WASHING:
          return { 
            bg: 'bg-green-50 dark:bg-slate-700', 
            text: 'text-green-900 dark:text-green-300', 
            badge: (
              <span className="flex items-center gap-1.5">
                <WashingIcon className="w-4 h-4" />
                {queueCopy.status.washing.toUpperCase()}
              </span>
            ), 
            badgeColor: 'bg-gradient-to-r from-green-400 to-green-500 text-white font-bold shadow-md' 
          };
        case QueueStatus.RETURNING_KEY:
          return { 
            bg: 'bg-orange-50 dark:bg-slate-700', 
            text: 'text-orange-900 dark:text-orange-300', 
            badge: (
              <span className="flex items-center gap-1.5">
                <KeyIcon className="w-4 h-4" />
                {queueCopy.status.returning.toUpperCase()}
              </span>
            ), 
            badgeColor: 'bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold shadow-md' 
          };
        case QueueStatus.DONE:
          return { 
            bg: 'bg-emerald-50 dark:bg-slate-700', 
            text: 'text-emerald-900 dark:text-emerald-300', 
            badge: (
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4" />
                {queueCopy.status.done.toUpperCase()}
              </span>
            ), 
            badgeColor: 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-bold shadow-md' 
          };
        default:
          return { 
            bg: 'bg-white', 
            text: 'text-gray-700', 
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
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><CalendarIcon className="w-6 h-6" />{queueCopy.title}</h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">{queueCopy.empty}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-800">
          <CalendarIcon className="w-5 h-5 inline-block mr-1" />{queueCopy.title} ({queuedItems.length})
        </h2>
        {isSuperAdmin && queuedItems.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="btn btn-danger px-3 py-1.5 text-sm shadow-md hover:shadow-lg active:scale-95"
            title={queueCopy.clear}
          >
            <DeleteIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{queueCopy.clear}</span>
          </button>
        )}
      </div>
      
      {/* ✅ Кнопки переноса для админа - вынесены из header */}
      {/* DEBUG: isAdmin={String(isAdmin)}, selectedItems.length={selectedItems.length} */}
      {isAdmin && selectedItems.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 m-3">
          <h4 className="font-bold text-blue-900 mb-2 text-sm">
            <CalendarIcon className="w-4 h-4 inline-block mr-1" />
            {queueCopy.moveSelected.replace("{{count}}", String(selectedItems.length))}
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
              className="btn bg-red-500 text-white hover:bg-red-600 px-2 py-2 text-xs"
            >
              {queueCopy.movePrev}
            </button>
    
            {/* Сегодня */}
            <button
              onClick={async () => {
                await transferSelectedToToday(selectedItems);
                setSelectedItems([]);
              }}
              className="btn bg-green-500 text-white hover:bg-green-600 px-2 py-2 text-xs"
            >
              {queueCopy.moveToday}
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
              className="btn bg-blue-500 text-white hover:bg-blue-600 px-2 py-2 text-xs"
            >
              {queueCopy.moveNext}
            </button>
          </div>
  
          {/* Отмена выбора */}
          <button
            onClick={() => setSelectedItems([])}
            className="w-full btn btn-neutral text-xs"
          >
            <CloseIcon className="w-4 h-4" />
            {queueCopy.moveCancel}
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        {sortedDates.map(dateKey => (
          <div key={dateKey} className="border-t-4 border-blue-200 pt-2 px-2">
            {/* ✅ Заголовок даты */}
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2 sticky top-0 bg-white dark:bg-slate-800 z-10 py-1">
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

                // ✅ Определяем цвет рамки по активному таймеру
                let borderColor = 'border-gray-300';
                if (item.return_requested_at && !item.finished_at) {
                  borderColor = 'border-orange-400';
                } else if (item.washing_started_at && !item.washing_finished_at && !item.return_requested_at) {
                  borderColor = 'border-green-400';
                } else if (item.key_issued_at && !item.washing_started_at) {
                  borderColor = 'border-blue-400';
                } else if (item.ready_at && !item.key_issued_at) {
                  borderColor = 'border-yellow-400';
                }
                
                if (isCurrentUser) borderColor = 'border-blue-600';
                
                return (
                  <div key={item.id} className={`${statusDisplay.bg} border-l-4 ${borderColor} rounded-lg p-3 shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={item.full_name} style={item.avatar_style} seed={item.avatar_seed} className="w-12 h-12" />
                        <div>
                          <div className="font-bold text-lg text-gray-900">{displayName}</div>
                          {displayRoom && <div className="text-xs text-gray-600">{queueCopy.labels.room} {displayRoom}</div>}
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
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex gap-1 ml-auto">
                          <button
                            onClick={() => changeQueuePosition(item.id, 'up')}
                            disabled={index === 0}
                            className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title={queueCopy.actions.moveUp}
                          >
                            <ChevronUpIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => changeQueuePosition(item.id, 'down')}
                            disabled={index === groupedQueue[dateKey].length - 1}
                            className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title={queueCopy.actions.moveDown}
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
                              label={queueCopy.timers.returning} 
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
                              label={queueCopy.timers.washing} 
                              color="green" 
                              multiplier={item.wash_count || 1}
                            />
                          )}
                          {item.key_issued_at && (
                            <Timer 
                              startTime={item.key_issued_at} 
                              endTime={item.washing_started_at || undefined}
                              label={queueCopy.timers.keyIssued} 
                              color="blue" 
                            />
                          )}
                          {item.ready_at && (
                            <Timer 
                              startTime={item.ready_at} 
                              endTime={item.key_issued_at || undefined}
                              label={queueCopy.timers.ready} 
                              color="yellow" 
                            />
                          )}
                      </div>
                    )}
                    
                    {/* Инфо - компактная сетка */}
                    <div className="grid grid-cols-3 gap-2 mb-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">{queueCopy.labels.washCount}</span>
                        <span className="text-lg font-bold text-blue-700">{item.wash_count || 1}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">{queueCopy.labels.payment}</span>
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
                          <span className="text-xs text-gray-600">{queueCopy.labels.finished}</span>
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
                          <span className="text-xs text-gray-600">{queueCopy.labels.finishes}</span>
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
                          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded">
                            <p className="font-bold text-yellow-800">{queueCopy.labels.adminMessage}: {item.admin_message}</p>
                          </div>
                        )}
                        
                        {/* Кнопки пользователя */}
                        {isCurrentUser && item.status === QueueStatus.WAITING && (
                          <button
                            onClick={() => leaveQueue(item.id)}
                            className="w-full btn btn-danger btn-attn"
                          >
                            <CloseIcon className="w-4 h-4" />
                            {t("queue.leave")}
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
                            <EditIcon className="w-4 h-4" /> {queueCopy.actions.actions}
                          </button>
                        )}
                        {isAdmin && (targetIsSuperAdmin ? isSuperAdmin : true) && openActionFor === item.id && (
                          <div 
                            ref={(el) => { actionMenuRefs.current[item.id] = el; }}
                            className="mt-3 bg-gray-50 border rounded-lg shadow-inner p-3 space-y-2"
                          >

                          {/* Позвать */}
                          <button
                            className="w-full btn bg-orange-500 text-white"
                            onClick={async () => {
                              try {
                                if (isSelfQueueItem) {
                                  alertWithCheck(queueCopy.errors.callSelf);
                                  return;
                                }
                                await updateQueueItem(item.id, { 
                                  admin_room: user?.room,
                                  ready_at: new Date().toISOString()
                                });
                                await setQueueStatus(item.id, QueueStatus.READY);

                                await sendTelegramNotification({
                                  type: 'admin_call_for_key',
                                  full_name: item.full_name,
                                  student_id: item.student_id,
                                  expected_finish_at: item.expected_finish_at,
                                  admin_student_id: user?.student_id,
                                });
                              } catch (error) {
                                showActionError(error, queueCopy.errors.callFail);
                                console.error('❌ Error in Позвать:', error);
                              }
                            }}
                            disabled={isSelfQueueItem}
                          >
                            <BellIcon className="w-4 h-4" /> {queueCopy.actions.call}
                          </button>

                          {/* Выдать ключ */}
                          <button
                            className="w-full btn btn-primary"
                            onClick={async () => {
                              try {
                                const now = new Date().toISOString();
                                // Сначала устанавливаем timestamp
                                await updateQueueItem(item.id, { 
                                  key_issued_at: now
                                });
                                // Потом меняем статус
                                await setQueueStatus(item.id, QueueStatus.KEY_ISSUED);
                                
                                // Отправляем уведомление студенту
                                await sendTelegramNotification({
                                  type: 'admin_key_issued',
                                  full_name: item.full_name,
                                  room: item.room,
                                  student_id: item.student_id,
                                });
                              } catch (error) {
                                showActionError(error, queueCopy.errors.issueFail);
                                console.error('❌ Error in Выдать ключ:', error);
                              }
                            }}
                          >
                            <KeyIcon className="w-4 h-4" /> {queueCopy.actions.issueKey}
                          </button>

                          {/* Стирать */}
                          <button
                            className="w-full btn bg-green-600 text-white"
                            onClick={async () => {
                              try {
                                const now = new Date().toISOString();
                                // Сначала устанавливаем timestamp
                                await updateQueueItem(item.id, { 
                                  washing_started_at: now
                                });
                                // Потом запускаем стирку (меняет статус)
                                await startWashing(item.id);
                                
                                // ✅ Отправляем уведомление студенту что админ запустил стирку
                                await sendTelegramNotification({
                                  type: 'washing_started',
                                  full_name: item.full_name,
                                  room: item.room,
                                  student_id: item.student_id,
                                  wash_count: item.wash_count,
                                });
                              } catch (error) {
                                showActionError(error, queueCopy.errors.startFail);
                                console.error('❌ Error in Стирать:', error);
                              }
                            }}
                          >
                            <WashingIcon className="w-4 h-4" /> {queueCopy.actions.startWash}
                          </button>

                          {/* Вернуть ключ */}
                          <button
                            className="w-full btn bg-orange-600 text-white"
                            onClick={async () => {
                              try {
                                if (isSelfQueueItem) {
                                  alertWithCheck(queueCopy.errors.returnSelf);
                                  return;
                                }
                                await updateQueueItem(item.id, { 
                                  return_key_alert: true,
                                  admin_room: user?.room,
                                  return_requested_at: new Date().toISOString()
                                });
                                await setQueueStatus(item.id, QueueStatus.RETURNING_KEY);
                                await sendTelegramNotification({
                                  type: "admin_return_key",
                                  full_name: item.full_name,
                                  student_id: item.student_id,
                                  admin_student_id: user?.student_id
                                });
                              } catch (error) {
                                showActionError(error, queueCopy.errors.returnFail);
                                console.error('? Error in Вернуть ключ:', error);
                              }
                            }}
                            disabled={isSelfQueueItem}
                          >
                            <BellIcon className="w-4 h-4" /> {queueCopy.actions.returnKey}
                          </button>

                          {/* Завершить */}
                          <button
                            className="w-full btn bg-emerald-600 text-white"
                            onClick={async () => {
                              try {
                                await markDone(item.id);
                              } catch (error) {
                                showActionError(error, queueCopy.errors.finishFail);
                                console.error('❌ Error in Завершить:', error);
                              }
                            }}
                          >
                            <CheckIcon className="w-4 h-4" /> {queueCopy.actions.finish}
                          </button>

                          {/* В ожидание - сбрасывает все timestamps */}
                          <button
                            className="w-full btn bg-purple-500 text-white"
                            onClick={async () => {
                              // Сначала сбрасываем все timestamps
                              await updateQueueItem(item.id, { 
                                ready_at: null,
                                key_issued_at: null,
                                washing_started_at: null,
                                return_requested_at: null,
                                admin_room: null,
                                return_key_alert: false
                              });
                              // Потом меняем статус
                              await setQueueStatus(item.id, QueueStatus.WAITING);
                            }}
                          >
                            <WaitIcon className="w-4 h-4" /> {queueCopy.actions.reset}
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
                            <DeleteIcon className="w-4 h-4" /> {queueCopy.actions.remove}
                          </button>

                          <button
                            onClick={() => setOpenActionFor(null)}
                            className="w-full text-gray-500 py-2 text-sm"
                          >
                            {queueCopy.actions.hideMenu}
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
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><EditIcon className="w-5 h-5" />{queueCopy.actions.editTitle}</h3>
            <p className="text-gray-700 mb-3">
              {queueCopy.actions.editStudent}: <span className="font-bold">{editingItem.full_name}</span>
            </p>
            
            <div className="space-y-3">
              {/* Дата стирки */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900 flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {queueCopy.actions.editDate}
                </label>
          <select
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
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
          <label className="block text-sm font-bold mb-2 text-gray-900">{queueCopy.actions.editWashCount}</label>
          <select
            value={editWashCount}
            onChange={(e) => setEditWashCount(Number(e.target.value))}
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 font-semibold"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        {/* Купоны */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-900">{queueCopy.actions.editCoupons}</label>
          <select
            value={editCouponsUsed}
            onChange={(e) => setEditCouponsUsed(Number(e.target.value))}
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
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
      <h3 className="text-xl font-bold text-gray-900 mb-4">{queueCopy.clearTitle}</h3>
      <p className="text-gray-700 mb-6">{queueCopy.clearConfirm}</p>
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
              alertWithCheck(queueCopy.clearSuccess);
            } catch (err: any) {
              alertWithCheck(queueCopy.clearError.replace("{{message}}", err?.message || ""));
            }
          }}
          className="flex-1 btn btn-danger"
        >
          {queueCopy.clear}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}







