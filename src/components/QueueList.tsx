"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { sendTelegramNotification } from '@/lib/telegram';

export default function QueueList() {
  const { 
    queue, 
    user, 
    leaveQueue, 
    updateQueueItem, 
    setQueueStatus,
    removeFromQueue,
    startWashing,
    cancelWashing,
    markDone,
    isAdmin,
    machineState,
    transferUnfinishedToNextDay,
    changeQueuePosition, 
  } = useLaundry();
  
  // ✅ Группировка по датам
  const groupQueueByDate = (items: any[]) => {
    const groups: { [key: string]: any[] } = {};
    
    items.forEach(item => {
      const date = item.currentDate || new Date().toISOString().slice(0, 10);
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
  const queuedItems = queue.filter(item => 
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
          
          {/* Кнопка переноса для админа */}
          {isAdmin && (
            <button
              onClick={transferUnfinishedToNextDay}
              className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
            >
              🔄 Перенести незавершенные
            </button>
          )}
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
        
        {/* ✅ Кнопка переноса для админа */}
        {isAdmin && (
          <button
            onClick={transferUnfinishedToNextDay}
            className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
          >
            🔄 Перенести
          </button>
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
              {groupedQueue[dateKey].map((item, index) => {
                const isCurrentUser = user && item.studentId === user.studentId;
                const statusDisplay = getStatusDisplay(item.status);
                const globalIndex = queuedItems.findIndex(q => q.id === item.id);
                
                return (
                  <div key={item.id} className={`${statusDisplay.bg} border-l-4 ${isCurrentUser ? 'border-blue-600' : 'border-gray-300'} rounded-lg p-3 shadow-sm`}>
                    {/* Заголовок с кнопками управления */}
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
                          <div className="font-bold text-lg text-gray-900">{item.userName}</div>
                          {item.userRoom && <div className="text-xs text-gray-600">Комната {item.userRoom}</div>}
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
                        <span className="text-lg font-bold text-blue-700">{item.washCount || 1}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">Оплата</span>
                        <span className="text-sm font-bold text-gray-900">
                          {item.paymentType === 'coupon' ? '🎫 Купон' : 
                           item.paymentType === 'both' ? '💵+🎫' : 
                           '💵 Деньги'}
                        </span>
                      </div>
                      {/* Время */}
                      {item.status === QueueStatus.DONE && item.finishedAt ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600">Закончил</span>
                          <span className="text-lg font-bold text-emerald-700">
                            {(() => {
                              const date = new Date(item.finishedAt);
                              const hours = date.getHours().toString().padStart(2, '0');
                              const minutes = date.getMinutes().toString().padStart(2, '0');
                              return `${hours}:${minutes}`;
                            })()}
                          </span>
                        </div>
                      ) : item.expectedFinishAt ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600">Закончит</span>
                          <span className="text-lg font-bold text-blue-700">
                            {(() => {
                              const date = new Date(item.expectedFinishAt);
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
                        {item.adminMessage && (
                          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded">
                            <p className="font-bold text-yellow-800">📢 {item.adminMessage}</p>
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
                              <button
                                className="bg-yellow-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-yellow-600 shadow-sm"
                                onClick={async () => {
                                  try {
                                    await updateQueueItem(item.id, { returnKeyAlert: false });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    await setQueueStatus(item.id, QueueStatus.READY);
                                    
                                    const success = await sendTelegramNotification({
                                      type: 'admin_call_for_key',
                                      userName: item.userName,
                                      userRoom: item.userRoom,
                                      studentId: item.studentId,
                                      expectedFinishAt: item.expectedFinishAt
                                    });
                                    
                                    alert(success ? `✅ ${item.userName} позван!` : `⚠️ ${item.userName} не подключил Telegram`);
                                  } catch (error) {
                                    console.error('❌ Ошибка при вызове:', error);
                                    alert('❌ Ошибка при вызове студента');
                                  }
                                }}
                              >
                                🔔 Позвать
                              </button>
                              
                              <button
                                className="bg-orange-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-orange-600 shadow-sm"
                                onClick={async () => {
                                  try {
                                    if (item.status === QueueStatus.READY) {
                                      await setQueueStatus(item.id, QueueStatus.WAITING);
                                      await new Promise(resolve => setTimeout(resolve, 100));
                                    }
                                    
                                    await updateQueueItem(item.id, { returnKeyAlert: true });
                                    
                                    const success = await sendTelegramNotification({
                                      type: 'admin_return_key',
                                      userName: item.userName,
                                      userRoom: item.userRoom,
                                      studentId: item.studentId,
                                      expectedFinishAt: item.expectedFinishAt
                                    });
                                    
                                    alert(success ? `✅ ${item.userName} попросили вернуть ключ!` : `⚠️ ${item.userName} не подключил Telegram`);
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
                                    await updateQueueItem(item.id, { returnKeyAlert: false });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    if (item.status === QueueStatus.READY) {
                                      await setQueueStatus(item.id, QueueStatus.WAITING);
                                    }
                                    
                                    alert(`✅ Уведомления отменены для ${item.userName}`);
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
                                    await updateQueueItem(item.id, { returnKeyAlert: false });
                                    await new Promise(resolve => setTimeout(resolve, 200));
                                    await startWashing(item.id);
                                    alert(`✅ ${item.userName} забрал ключ и начал стирку!`);
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
                                    await updateQueueItem(item.id, { returnKeyAlert: false });
                                    await new Promise(resolve => setTimeout(resolve, 200));
                                    await startWashing(item.id);
                                    alert(`✅ ${item.userName} стирает!`);
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
                                    await updateQueueItem(item.id, { returnKeyAlert: false });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    await markDone(item.id);
                                    alert(`✅ ${item.userName} закончил!`);
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
                                    await updateQueueItem(item.id, { returnKeyAlert: false });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    if (item.status === QueueStatus.WASHING) {
                                      await cancelWashing(item.id);
                                    } else {
                                      await setQueueStatus(item.id, QueueStatus.WAITING);
                                    }
                                    
                                    alert(`✅ ${item.userName} в ожидании`);
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
                                if (confirm(`Удалить ${item.userName} из очереди?`)) {
                                  await removeFromQueue(item.id);
                                  alert(`✅ ${item.userName} удален!`);
                                }
                              }}
                            >
                              🗑️ Удалить из очереди
                            </button>
                          </div>
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
    </div>
  );
}