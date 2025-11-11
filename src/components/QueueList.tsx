"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { sendTelegramNotification } from '@/lib/telegram';
import { useState, useEffect } from 'react';

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
const [editHour, setEditHour] = useState('20');
const [editMinute, setEditMinute] = useState('00');
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
    
    // Парсим expectedFinishAt
    if (item.expected_finish_at) {
      const date = new Date(item.expected_finish_at);
      setEditHour(date.getHours().toString().padStart(2, '0'));
      setEditMinute(date.getMinutes().toString().padStart(2, '0'));
    } else {
      setEditHour('20');
      setEditMinute('00');
    }
    
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
  
  const today = new Date();
  today.setHours(parseInt(editHour), parseInt(editMinute), 0, 0);
  const expectedFinishAt = today.toISOString();
  
  await updateQueueItemDetails(editingItem.id, {
    wash_count: editWashCount,
    payment_type: editPaymentType,
    expected_finish_at: expectedFinishAt,
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
        return { bg: 'bg-gray-50', text: 'text-gray-700', badge: '⏳ Ожидает', badgeColor: 'bg-gray-200 text-gray-700' };
      case QueueStatus.READY:
        return { bg: 'bg-yellow-50', text: 'text-yellow-900', badge: '🟡 СЛЕДУЮЩИЙ!', badgeColor: 'bg-yellow-400 text-yellow-900' };
      case QueueStatus.KEY_ISSUED:
        return { bg: 'bg-blue-50', text: 'text-blue-900', badge: '🔑 Ключ выдан', badgeColor: 'bg-blue-400 text-blue-900' };
      case QueueStatus.WASHING:
        return { bg: 'bg-green-50', text: 'text-green-900', badge: '🟢 СТИРАЕТ', badgeColor: 'bg-green-400 text-green-900' };
      case QueueStatus.DONE:
        return { bg: 'bg-emerald-50', text: 'text-emerald-900', badge: '✅ ПОСТИРАЛСЯ', badgeColor: 'bg-emerald-400 text-emerald-900' };
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
    item.status === QueueStatus.DONE
  );

  // ✅ Группируем очередь по датам
  const groupedQueue = groupQueueByDate(queuedItems);
  const sortedDates = Object.keys(groupedQueue).sort();

  if (queuedItems.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">📋 Очередь</h2>
        </div>
      </div>
    );
  }

  console.log('🎰 Machine State:', machineState);
  
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-800">
          📋 Очередь ({queuedItems.length})
        </h2>
        
                        {/* Кнопки переноса для админа */}
                        {/* ✅ НОВЫЙ БЛОК: Кнопки переноса */}
        {isAdmin && selectedItems.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 mb-3">
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
      </div>
      
      <div className="p-2 space-y-4">
        {sortedDates.map(dateKey => (
          <div key={dateKey} className="border-t-4 border-blue-200 pt-2">
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
                          <div className="font-bold text-lg text-gray-900">{item.full_name}</div>
                          {item.room && <div className="text-xs text-gray-600">Комната {item.room}</div>}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusDisplay.badgeColor} whitespace-nowrap`}>
                        {statusDisplay.badge}
                      </span>
                    </div>
                    
                    {/* Инфо - компактная сетка */}
                    <div className="grid grid-cols-3 gap-2 mb-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">Стирок</span>
                        <span className="text-lg font-bold text-blue-700">{item.wash_count || 1}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">Оплата</span>
                        <span className="text-sm font-bold text-gray-900">
                          {item.payment_type === 'coupon' ? '🎫 Купон' : 
                           item.payment_type === 'both' ? '💵+🎫' : 
                           '💵 Деньги'}
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
                            {/* БЛОК: Уведомления */}
                            <div className="grid grid-cols-3 gap-2">
                            {/* КНОПКА: Позвать */}
                            <button
                              className="bg-yellow-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-yellow-600 shadow-sm"
                              onClick={async () => {
                                try {
                                  await updateQueueItem(item.id, { return_key_alert: false });
                                  await new Promise(resolve => setTimeout(resolve, 100));
                                  await setQueueStatus(item.id, QueueStatus.READY);
      
                                  // ✅ КРИТИЧНО: Передаём admin_student_id
                                  const success = await sendTelegramNotification({
                                    type: 'admin_call_for_key',
                                    full_name: item.full_name,
                                    room: item.room,
                                    student_id: item.student_id,
                                    expected_finish_at: item.expected_finish_at,
                                    admin_student_id: user?.student_id,  // ✅ Это уже есть
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
                              🔔 Позвать
                            </button>

                            {/* КНОПКА: Вернуть ключ */}
                            <button
                              className="bg-orange-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-orange-600 shadow-sm"
                              onClick={async () => {
                                try {
                                  if (item.status === QueueStatus.READY) {
                                    await setQueueStatus(item.id, QueueStatus.WAITING);
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                  }
                                  
                                  await updateQueueItem(item.id, { return_key_alert: true });
                                  
                                  // ✅ КРИТИЧНО: Передаём admin_student_id
                                  const success = await sendTelegramNotification({
                                    type: 'admin_return_key',
                                    full_name: item.full_name,
                                    room: item.room,
                                    student_id: item.student_id,
                                    expected_finish_at: item.expected_finish_at,
                                    admin_student_id: user?.student_id,  // ✅ ID админа
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
                              🔔 Вернуть
                            </button>
                              
                              <button
                                className="bg-gray-400 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-gray-500 shadow-sm"
                                onClick={async () => {
                                  try {
                                    if (!isAdmin) {
                                      alert('❌ Только администратор может отменить уведомления');
                                      return;
                                    }
                                    await updateQueueItem(item.id, { return_key_alert: false });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    if (item.status === QueueStatus.READY) {
                                      await setQueueStatus(item.id, QueueStatus.WAITING);
                                    }
                                    
                                    alert(`✅ Уведомления отменены для ${item.full_name}`);
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка отмены уведомлений');
                                  }
                                }}
                              >
                                🔕 Отменить
                              </button>
                            </div>

                            {/* БЛОК: Действия со статусом */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                className="bg-blue-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-blue-700 shadow-sm"
                                onClick={async () => {
                                  try {
                                    if (!isAdmin) {
                                      alert('❌ Только администратор может выполнять это действие');
                                      return;
                                    }
                                    await updateQueueItem(item.id, { return_key_alert: false });
                                    await new Promise(resolve => setTimeout(resolve, 200));
                                    await startWashing(item.id);
                                    alert(`✅ ${item.full_name} забрал ключ и начал стирку!`);
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка при выдаче ключа');
                                  }
                                }}
                              >
                                🔑 Ключ выдан
                              </button>
                              
                              <button
                                className="bg-green-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-green-700 shadow-sm"
                                onClick={async () => {
                                  try {
                                    if (!isAdmin) {
                                      alert('❌ Только администратор может выполнять это действие');
                                      return;
                                    }
                                    await updateQueueItem(item.id, { return_key_alert: false });
                                    await new Promise(resolve => setTimeout(resolve, 200));
                                    await startWashing(item.id);
                                    alert(`✅ ${item.full_name} стирает!`);   
                                  } catch (error) {
                                    console.error('❌ Ошибка:', error);
                                    alert('❌ Ошибка при запуске стирки');
                                  }
                                }}
                              >
                                🟢 Стирает
                              </button>
                              
                              <button
                                className="bg-emerald-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-emerald-700 shadow-sm"
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
                                ✅ Завершить
                              </button>
                              
                              <button
                                className="bg-purple-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-purple-600 shadow-sm"
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
                                ⏳ В ожидание
                              </button>
                            </div>
                            {/* БЛОК: Удалить */}
                            <button
                              className="bg-red-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-red-700 shadow-sm w-full"
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
                              🗑️ Удалить из очереди
                            </button>
                          </div>
                        )}

                        {/* БЛОК: Редактировать */}
                        
                        {(isAdmin) && item.status === QueueStatus.WAITING && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            title="Редактировать параметры"
                          >
                            Редактировать
                          </button>
                        )}
                            
                        {/* Статус для не-админа */}
                        {!isAdmin && item.status === QueueStatus.WASHING && (
                          <span className="text-green-700 font-bold text-sm">🟢 Стирает...</span>
                          )}
                        {!isAdmin && item.status === QueueStatus.DONE && (
                          <span className="text-emerald-700 font-bold text-sm">✅ Готово</span>
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">✏️ Редактировать запись</h3>
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
          <input
            type="number"
            min="1"
            max="10"
            value={editWashCount}
            onChange={(e) => setEditWashCount(Number(e.target.value))}
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
          />
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
        
        {/* Время окончания */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-900">Закончит в</label>
          <div className="flex gap-2">
            <select
              value={editHour}
              onChange={(e) => setEditHour(e.target.value)}
              className="flex-1 border-2 border-gray-300 rounded-lg p-2 text-gray-900"
            >
              {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                <option key={hour} value={hour.toString().padStart(2, '0')}>
                  {hour.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <span className="text-2xl text-gray-900">:</span>
            <select
              value={editMinute}
              onChange={(e) => setEditMinute(e.target.value)}
              className="flex-1 border-2 border-gray-300 rounded-lg p-2 text-gray-900"
            >
              {Array.from({ length: 60 }, (_, i) => i).map(minute => (
                <option key={minute} value={minute.toString().padStart(2, '0')}>
                  {minute.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
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