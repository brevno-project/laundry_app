"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { sendTelegramNotification } from '@/lib/telegram';
import { useState, useEffect } from 'react';
import Timer from './Timer';
import QueueTimers from './QueueTimers';
import { CalendarIcon, BellIcon, KeyIcon, WashingIcon, BellOffIcon, WaitIcon, CheckIcon, DeleteIcon, EditIcon, TicketIcon, MoneyIcon } from '@/components/Icons';
import Avatar, { AvatarType } from '@/components/Avatar';

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
    machineState,
    transferSelectedToDate,
    transferSelectedToToday,  
    changeQueuePosition, 
    updateQueueEndTime,
    updateQueueItemDetails,
    optimisticUpdateQueueItem,
    banStudent,
    unbanStudent,
  } = useLaundry();
  
  const [tempTimes, setTempTimes] = useState<{ [key: string]: string }>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const setTempTime = (id: string, time: string) => {
    setTempTimes(prev => ({ ...prev, [id]: time }));
  };
  const [showEditModal, setShowEditModal] = useState(false);
const [editingItem, setEditingItem] = useState<any>(null);
const [editWashCount, setEditWashCount] = useState(1);
const [editPaymentType, setEditPaymentType] = useState('money');
const [editDate, setEditDate] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditWashCount(item.wash_count || 1);
    setEditPaymentType(item.payment_type || 'money');
    setEditDate(item.queue_date || new Date().toISOString().slice(0, 10));
    setShowEditModal(true);
  };

  // Функция сохранения изменений:
  // Функция сохранения изменений:
const handleSaveEdit = async () => {
  if (!editingItem) return;
  
  if (!isAdmin) {
    alert('❌ Только администратор может редактировать записи');
    return;
  }
  
  await updateQueueItemDetails(editingItem.id, {
    wash_count: editWashCount,
    payment_type: editPaymentType,
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
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    
    const itemDate = new Date(dateStr + 'T00:00:00');
    itemDate.setHours(0, 0, 0, 0);
    
    if (itemDate.getTime() === today.getTime()) {
      return '📅 Сегодня, ' + dayNames[date.getDay()] + ' ' + date.getDate() + '.' + (date.getMonth() + 1);
    }
    
    if (itemDate.getTime() === tomorrow.getTime()) {
      return '📅 Завтра, ' + dayNames[date.getDay()] + ' ' + date.getDate() + '.' + (date.getMonth() + 1);
    }
    
    return '📅 ' + dayNames[date.getDay()] + ', ' + date.getDate() + '.' + (date.getMonth() + 1);
  };

  // Добавь эту функцию в начало компонента QueueList:
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);      
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
  // Функция для получения цвета и текста статуса
  const getStatusDisplay = (status: QueueStatus) => {
    switch(status) {
      case QueueStatus.WAITING:
        return { bg: 'bg-gray-50', text: 'text-gray-700', badge: '⏳ Ожидание', badgeColor: 'bg-gray-200 text-gray-700' };
      case QueueStatus.READY:
        return { bg: 'bg-yellow-50', text: 'text-yellow-900', badge: '🏃 ЗА КЛЮЧОМ', badgeColor: 'bg-yellow-400 text-yellow-900' };
      case QueueStatus.KEY_ISSUED:
        return { bg: 'bg-blue-50', text: 'text-blue-900', badge: '🔑 КЛЮЧ ПОЛУЧЕН', badgeColor: 'bg-blue-400 text-blue-900' };
      case QueueStatus.WASHING:
        return { bg: 'bg-green-50', text: 'text-green-900', badge: '🟢 СТИРКА', badgeColor: 'bg-green-400 text-green-900' };
      case QueueStatus.RETURNING_KEY:
        return { bg: 'bg-orange-50', text: 'text-orange-900', badge: '🏃 ВОЗВРАТ КЛЮЧА', badgeColor: 'bg-orange-400 text-orange-900' };
      case QueueStatus.DONE:
        return { bg: 'bg-emerald-50', text: 'text-emerald-900', badge: '✅ ЗАВЕРШЕНО', badgeColor: 'bg-emerald-400 text-emerald-900' };
      default:
        return { bg: 'bg-white', text: 'text-gray-700', badge: status, badgeColor: 'bg-gray-200' };
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
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><CalendarIcon className="w-6 h-6" />Очередь</h2>
        </div>
      </div>
    );
  }

  console.log('🎰 Machine State:', machineState);
  console.log('🔑 isAdmin:', isAdmin, 'selectedItems:', selectedItems.length);
  
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-800">
          <CalendarIcon className="w-5 h-5 inline-block mr-1" />Очередь ({queuedItems.length})
        </h2>
      </div>
      
      {/* ✅ Кнопки переноса для админа - вынесены из header */}
      {/* DEBUG: isAdmin={String(isAdmin)}, selectedItems.length={selectedItems.length} */}
      {isAdmin && selectedItems.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 m-3">
          <h4 className="font-bold text-blue-900 mb-2 text-sm">
            📅 Перенести выбранных ({selectedItems.length})
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
              className="bg-red-500 text-white font-semibold py-2 px-2 rounded-lg hover:bg-red-600 text-xs"
            >
              ⬅️ Назад
            </button>
    
            {/* Сегодня */}
            <button
              onClick={async () => {
                await transferSelectedToToday(selectedItems);
                setSelectedItems([]);
              }}
              className="bg-green-500 text-white font-semibold py-2 px-2 rounded-lg hover:bg-green-600 text-xs"
            >
              Сегодня
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
              className="bg-blue-500 text-white font-semibold py-2 px-2 rounded-lg hover:bg-blue-600 text-xs"
            >
              Вперед ➡️
            </button>
          </div>
  
          {/* Отмена выбора */}
          <button
            onClick={() => setSelectedItems([])}
            className="w-full mt-2 bg-gray-400 text-white font-semibold py-2 px-3 rounded-lg hover:bg-gray-500 text-xs"
          >
            ❌ Отменить выбор
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        {sortedDates.map(dateKey => (
          <div key={dateKey} className="border-t-4 border-blue-200 pt-2 px-2">
            {/* ✅ Заголовок даты */}
            <h3 className="text-lg font-bold text-blue-900 mb-2 sticky top-0 bg-white z-10 py-1">
              {formatDateHeader(dateKey)}
            </h3>
            
            {/* ✅ Список записей на эту дату */}
            <div className="space-y-3">
            {groupedQueue[dateKey].map((item: any, index: number) => {
                const isCurrentUser = user && item.student_id === user.student_id;
                console.log('QueueItem:', item.id, 'student_id:', item.student_id, 'user.student_id:', user?.student_id, 'isCurrentUser:', isCurrentUser, 'status:', item.status);
                const statusDisplay = getStatusDisplay(item.status);
                const globalIndex = queuedItems.findIndex((q: any) => q.id === item.id);
                
                return (
                  <div key={item.id} className={`${statusDisplay.bg} border-l-4 ${isCurrentUser ? 'border-blue-600' : 'border-gray-300'} rounded-lg p-3 shadow-sm`}>
                    {/* Заголовок с кнопками управления */}
                    {/* Чекбокс для выбора */}
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="mr-2 mb-2"
                      />
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* ✅ Кнопки перемещения для админа */}
                        {isAdmin && item.status === QueueStatus.WAITING && (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => changeQueuePosition(item.id, 'up')}
                              disabled={index === 0}
                              className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded disabled:opacity-30 hover:bg-gray-300"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => changeQueuePosition(item.id, 'down')}
                              disabled={index === groupedQueue[dateKey].length - 1}
                              className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded disabled:opacity-30 hover:bg-gray-300"
                            >
                              ▼
                            </button>
                          </div>
                        )}
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-gray-900">
                              #{globalIndex + 1}
                            </span>
                            {item.position && (
                              <span className="text-sm text-gray-500 font-semibold">
                                (поз.{item.position})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar type={(item.avatar_type as AvatarType) || 'default'} className="w-14 h-14" />
                            <div>
                              <div className="font-bold text-lg text-gray-900">{item.full_name}</div>
                              {item.room && <div className="text-xs text-gray-600">Комната {item.room}</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusDisplay.badgeColor} whitespace-nowrap`}>
                        {statusDisplay.badge}
                      </span>
                    </div>
                    
                    {/* ✅ Таймер с цветовой индикацией */}
                    <div className="mb-2">
                      <QueueTimers item={item} />
                    </div>
                    
                    {/* ✅ Таймеры - показываем всю историю */}
                    {(item.ready_at || item.key_issued_at || item.washing_started_at || item.return_requested_at) && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.ready_at && (
                          <Timer 
                            startTime={item.ready_at} 
                            endTime={item.key_issued_at || (item.status !== QueueStatus.READY ? new Date().toISOString() : undefined)}
                            label="Идет за ключом" 
                            color="yellow" 
                          />
                        )}
                        {item.key_issued_at && (
                          <Timer 
                            startTime={item.key_issued_at} 
                            endTime={item.washing_started_at || (item.status !== QueueStatus.KEY_ISSUED ? new Date().toISOString() : undefined)}
                            label="Ключ выдан" 
                            color="blue" 
                          />
                        )}
                        {item.washing_started_at && (
                          <Timer 
                            startTime={item.washing_started_at} 
                            endTime={item.return_requested_at || item.finished_at || (item.status !== QueueStatus.WASHING ? new Date().toISOString() : undefined)}
                            label="Стирает" 
                            color="green" 
                          />
                        )}
                        {item.return_requested_at && (
                          <Timer 
                            startTime={item.return_requested_at} 
                            endTime={item.finished_at || (item.status !== QueueStatus.RETURNING_KEY ? new Date().toISOString() : undefined)}
                            label="Возвращает ключ" 
                            color="orange" 
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Инфо - компактная сетка */}
                    <div className="grid grid-cols-3 gap-2 mb-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">Стирок</span>
                        <span className="text-lg font-bold text-blue-700">{item.wash_count || 1}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">Оплата</span>
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                          {item.payment_type === 'coupon' ? (
                            <><TicketIcon className="w-4 h-4 text-purple-600" />Купон</>
                          ) : item.payment_type === 'both' ? (
                            <><MoneyIcon className="w-4 h-4 text-green-600" /><TicketIcon className="w-4 h-4 text-purple-600" /></>
                          ) : (
                            <><MoneyIcon className="w-4 h-4 text-green-600" />Деньги</>
                          )}
                        </span>
                      </div>
                      {/* Время */}
                      {item.status === QueueStatus.DONE && item.finished_at ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600">Закончил</span>
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
                          <span className="text-xs text-gray-600">Закончит</span>
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
                            <p className="font-bold text-yellow-800">📢 {item.admin_message}</p>
                          </div>
                        )}
                        
                        {/* Кнопки пользователя */}
                        {isCurrentUser && item.status === QueueStatus.WAITING && (
                          <button
                            onClick={() => leaveQueue(item.id)}
                            className="bg-red-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-red-600 shadow-sm text-sm w-full"
                          >
                            ❌ Покинуть очередь
                          </button>
                        )}
                        
                        {/* Кнопки админа */}
                        {isAdmin && (
                          <div className="space-y-2">
                            {/* БЛОК: Основные действия */}
                            <div className="flex flex-col gap-2">
                            {/* КНОПКА: Позвать */}
                            <button
                              className="bg-orange-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-orange-600 shadow-sm flex items-center justify-center gap-1"
                              onClick={async () => {
                                try {
                                  // ✅ Сохраняем комнату админа и время вызова
                                  await updateQueueItem(item.id, { 
                                    return_key_alert: false,
                                    admin_room: user?.room, // ✅ Комната админа
                                    ready_at: new Date().toISOString() // ✅ Время когда позвали
                                  });
                                  await new Promise(resolve => setTimeout(resolve, 100));
                                  await setQueueStatus(item.id, QueueStatus.READY);
      
                                  // ✅ КРИТИЧНО: Передаём admin_student_id, НЕ передаём room студента
                                  const success = await sendTelegramNotification({
                                    type: 'admin_call_for_key',
                                    full_name: item.full_name,
                                    student_id: item.student_id,
                                    expected_finish_at: item.expected_finish_at,
                                    admin_student_id: user?.student_id,  // ✅ ID админа
                                  });
      
                                  alert(success 
                                    ? `✅ ${item.full_name} позван!` 
                                    : `⚠️ ${item.full_name} не подключил Telegram`
                                  );
                                } catch (error) {
                                  console.error('❌ Ошибка при вызове:', error);
                                  alert('❌ Ошибка при вызове студента');
                                }
                              }}
                            >
                              <BellIcon className="w-4 h-4" />Позвать
                            </button>

                            </div>

                            {/* БЛОК: Действия со статусом */}
                            <div className="flex flex-col gap-2">
                              <button
                                className="bg-blue-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-blue-700 shadow-sm w-full flex items-center justify-center gap-1"
                                onClick={async () => {
                                  try {
                                    if (!isAdmin) {
                                      alert('❌ Только администратор может выполнять это действие');
                                      return;
                                    }
                                    // ✅ Устанавливаем статус KEY_ISSUED и сохраняем время
                                    await updateQueueItem(item.id, { 
                                      return_key_alert: false,
                                      key_issued_at: new Date().toISOString() // ✅ Время выдачи ключа
                                    });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    await setQueueStatus(item.id, QueueStatus.KEY_ISSUED);
                                    
                                    // ✅ Отправляем Telegram уведомление
                                    try {
                                      await fetch('/api/telegram/notify', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          type: 'key_issued',
                                          full_name: item.full_name,
                                          room: item.room,
                                          student_id: item.student_id
                                        })
                                      });
                                    } catch (err) {
                                      console.error('❌ Error sending Telegram notification:', err);
                                    }
                                    
                                    alert(`✅ ${item.full_name} получил ключ!`);
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка при выдаче ключа');
                                  }
                                }}
                              >
                                <KeyIcon className="w-4 h-4" />Выдать ключ
                              </button>
                              
                              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                              
                              <button
                                className="bg-green-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-green-700 shadow-sm w-full flex items-center justify-center gap-1"
                                onClick={async () => {
                                  try {
                                    if (!isAdmin) {
                                      alert('❌ Только администратор может выполнять это действие');
                                      return;
                                    }
                                    // ✅ Сохраняем время начала стирки
                                    await updateQueueItem(item.id, { 
                                      return_key_alert: false,
                                      washing_started_at: new Date().toISOString() // ✅ Время начала стирки
                                    });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    await startWashing(item.id);
                                    alert(`✅ ${item.full_name} стирает!`);   
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка при запуске стирки');
                                  }
                                }}
                              >
                                <WashingIcon className="w-4 h-4" />Стирать
                              </button>
                              
                              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                              
                              {/* КНОПКА: Вернуть ключ */}
                              <button
                                className="bg-orange-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-orange-600 shadow-sm w-full flex items-center justify-center gap-1"
                                onClick={async () => {
                                  try {
                                    // ✅ Устанавливаем статус RETURNING_KEY
                                    await setQueueStatus(item.id, QueueStatus.RETURNING_KEY);
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    // ✅ Сохраняем комнату админа и время запроса
                                    await updateQueueItem(item.id, { 
                                      return_key_alert: true,
                                      admin_room: user?.room,
                                      return_requested_at: new Date().toISOString()
                                    });
                                    
                                    const success = await sendTelegramNotification({
                                      type: 'admin_return_key',
                                      full_name: item.full_name,
                                      student_id: item.student_id,
                                      expected_finish_at: item.expected_finish_at,
                                      admin_student_id: user?.student_id,
                                    });
                                    
                                    alert(success 
                                      ? `✅ ${item.full_name} попросили вернуть ключ!` 
                                      : `⚠️ ${item.full_name} не подключил Telegram`
                                    );
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка отправки уведомления');
                                  }
                                }}
                              >
                                <BellIcon className="w-4 h-4" />Вернуть ключ
                              </button>
                              
                              <button
                                className="bg-gray-400 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-gray-500 shadow-sm w-full flex items-center justify-center gap-1"
                                onClick={async () => {
                                  try {
                                    if (!isAdmin) {
                                      alert('❌ Только администратор может отменить уведомления');
                                      return;
                                    }
                                    
                                    await updateQueueItem(item.id, { 
                                      return_key_alert: false,
                                      admin_room: undefined,
                                      ready_at: undefined,
                                      return_requested_at: undefined
                                    });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    if (item.status === QueueStatus.READY || 
                                        item.status === QueueStatus.KEY_ISSUED ||
                                        item.status === QueueStatus.RETURNING_KEY) {
                                      await setQueueStatus(item.id, QueueStatus.WAITING);
                                    }
                                    
                                    alert(`✅ Уведомления отменены для ${item.full_name}`);
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка отмены уведомлений');
                                  }
                                }}
                              >
                                <BellOffIcon className="w-4 h-4" />Отменить уведомления
                              </button>
                              
                              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                              
                              <button
                                className="bg-emerald-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-emerald-700 shadow-sm w-full flex items-center justify-center gap-1"
                                onClick={async () => {
                                  try {
                                    if (!isAdmin) {
                                      alert('❌ Только администратор может выполнять это действие');
                                      return;
                                    }
                                    await updateQueueItem(item.id, { return_key_alert: false });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    await markDone(item.id);
                                    alert(`✅ ${item.full_name} закончил!`);
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка при завершении');
                                  }
                                }}
                              >
                                <CheckIcon className="w-4 h-4" />Завершить
                              </button>
                              
                              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                              
                              <button
                                className="bg-purple-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-purple-600 shadow-sm w-full flex items-center justify-center gap-1"
                                onClick={async () => {
                                  try {
                                    if (!isAdmin) {
                                      alert('❌ Только администратор может выполнять это действие');
                                      return;
                                    }
                                    await updateQueueItem(item.id, { return_key_alert: false });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    if (item.status === QueueStatus.WASHING) {
                                      await cancelWashing(item.id);
                                    } else {
                                      await setQueueStatus(item.id, QueueStatus.WAITING);
                                    }
                                    
                                    alert(`✅ ${item.full_name} в ожидании`);
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка при возврате в ожидание');
                                  }
                                }}
                              >
                                <WaitIcon className="w-4 h-4" />В ожидание
                              </button>
                            </div>
                            
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2"></div>
                            
                            {/* БЛОК: Удалить */}
                            <button
                              className="bg-red-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-red-700 shadow-sm w-full flex items-center justify-center gap-1"
                              onClick={async () => {
                                if (!isAdmin) {
                                  alert('❌ Только администратор может выполнять это действие');
                                  return;
                                }
                                if (confirm(`Удалить ${item.full_name} из очереди?`)) {
                                  await removeFromQueue(item.id);
                                  alert(`✅ ${item.full_name} удален!`);
                                }
                              }}
                            >
                              <DeleteIcon className="w-4 h-4" />Удалить из очереди
                            </button>
                          </div>
                        )}

                        {/* БЛОК: Редактировать */}
                        
                        {(isAdmin) && item.status === QueueStatus.WAITING && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 w-full flex items-center justify-center gap-2 font-semibold shadow-sm"
                            title="Редактировать параметры"
                          >
                            <EditIcon className="w-4 h-4" />Редактировать
                          </button>
                        )}
                            
                        {/* Статус для не-админа - убран, так как уже отображается выше */}
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><EditIcon className="w-5 h-5" />Редактировать запись</h3>
            <p className="text-gray-700 mb-3">
              Студент: <span className="font-bold">{editingItem.full_name}</span>
            </p>
            
            <div className="space-y-3">
              {/* Дата стирки */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">📅 Дата стирки</label>
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
          <label className="block text-sm font-bold mb-2 text-gray-900">Количество стирок</label>
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
        
        {/* Способ оплаты */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-900">Способ оплаты</label>
          <select
            value={editPaymentType}
            onChange={(e) => setEditPaymentType(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
          >
            <option value="money">💵 Деньги</option>
            <option value="coupon">🎫 Купон</option>
            <option value="both">💵+🎫 Оба</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setShowEditModal(false)}
          className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
        >
          Отмена
        </button>
        <button
          onClick={handleSaveEdit}
          className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          Сохранить
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}