"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { formatDate } from '@/contexts/LaundryContext';
import { sendTelegramNotification } from '@/lib/telegram';

export default function QueueList() {
  const { 
    queue, 
    user, 
    leaveQueue, 
    updateQueueItem, 
    sendAdminMessage,
    setQueueStatus,
    removeFromQueue,
    startWashing,
    cancelWashing,
    markDone,
    isAdmin,
    machineState
  } = useLaundry();
  
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

  if (queuedItems.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-2 text-gray-800">📋 Очередь</h2>
      </div>
    );
  }

  console.log('🎰 Machine State:', machineState);
  
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold p-3 bg-gray-50 rounded-t-lg text-gray-800">📋 Очередь ({queuedItems.length})</h2>
      
      <div className="p-2 space-y-3">
        {queuedItems.map((item, index) => {
            const isCurrentUser = user && item.studentId === user.studentId;
            const statusDisplay = getStatusDisplay(item.status);
            
            return (
              <div key={item.id} className={`${statusDisplay.bg} border-l-4 ${isCurrentUser ? 'border-blue-600' : 'border-gray-300'} rounded-lg p-3 shadow-sm`}>
                {/* Заголовок */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-gray-900">#{index + 1}</span>
                    <div>
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
  {/* Позвать */}
  <button
    className="bg-yellow-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-yellow-600 shadow-sm"
    onClick={async () => {
      try {
        console.log('🔔 Позвать нажата для:', item.userName, item.id);
        
        // ✅ Убрать флаг "Принеси ключ" перед изменением статуса
        await updateQueueItem(item.id, { returnKeyAlert: false });
        
        // ✅ Изменить статус на READY
        await setQueueStatus(item.id, QueueStatus.READY);
        console.log('✅ Статус изменен на READY');
        
        // Отправить уведомление в Telegram
        const success = await sendTelegramNotification({
          type: 'admin_call_for_key',
          userName: item.userName,
          userRoom: item.userRoom,
          studentId: item.studentId,
          expectedFinishAt: item.expectedFinishAt
        });
        
        if (success) {
          alert(`✅ ${item.userName} позван!`);
        } else {
          alert(`⚠️ ${item.userName} не подключил Telegram`);
        }
      } catch (error) {
        console.error('❌ Ошибка при вызове:', error);
        alert('❌ Ошибка при вызове студента');
      }
    }}
  >
    🔔 Позвать
  </button>
  
  {/* Вернуть ключ */}
  <button
    className="bg-orange-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-orange-600 shadow-sm"
    onClick={async () => {
      try {
        console.log('🔔 Вернуть нажата для:', item.userName, item.id);
        
        // ✅ Установить флаг "Принеси ключ" (он переопределит "Позвать")
        await updateQueueItem(item.id, { returnKeyAlert: true });
        console.log('✅ returnKeyAlert установлен!');
        
        // Отправить уведомление в Telegram
        const success = await sendTelegramNotification({
          type: 'admin_return_key',
          userName: item.userName,
          userRoom: item.userRoom,
          studentId: item.studentId,
          expectedFinishAt: item.expectedFinishAt
        });
        
        if (success) {
          alert(`✅ ${item.userName} попросили вернуть ключ!`);
        } else {
          alert(`⚠️ ${item.userName} не подключил Telegram`);
        }
      } catch (error) {
        console.error('❌ Ошибка отправки уведомления:', error);
        alert('❌ Ошибка отправки уведомления');
      }
    }}
  >
    🔔 Вернуть
  </button>
  
  {/* Отменить уведомления */}
  <button
    className="bg-gray-400 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-gray-500 shadow-sm"
    onClick={async () => {
      try {
        console.log('🔕 Отменить уведомления для:', item.userName, item.id);
        
        // ✅ Убрать флаг "Принеси ключ"
        await updateQueueItem(item.id, { returnKeyAlert: false });
        
        // ✅ Если статус READY - вернуть в WAITING
        if (item.status === QueueStatus.READY) {
          await setQueueStatus(item.id, QueueStatus.WAITING);
        }
        
        alert(`✅ Уведомления отменены для ${item.userName}`);
      } catch (error) {
        console.error('❌ Ошибка отмены:', error);
        alert('❌ Ошибка отмены уведомлений');
      }
    }}
  >
    🔕 Отменить
  </button>
</div>

{/* БЛОК: Действия со статусом */}
<div className="grid grid-cols-2 gap-2">
  {/* Ключ выдан (автоматически стирает) */}
  <button
    className="bg-blue-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-blue-700 shadow-sm"
    onClick={async () => {
      try {
        console.log('🔑 Ключ выдан для:', item.userName, item.id);
        
        // ✅ Сначала убрать ВСЕ уведомления
        await updateQueueItem(item.id, { returnKeyAlert: false });
        
        // ✅ Затем начать стирку
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
  
  {/* Просто стирает (без ключа) */}
  <button
    className="bg-green-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-green-700 shadow-sm"
    onClick={async () => {
      try {
        console.log('🟢 Стирает для:', item.userName, item.id);
        
        // ✅ Сначала убрать ВСЕ уведомления
        await updateQueueItem(item.id, { returnKeyAlert: false });
        
        // ✅ Затем начать стирку
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
  
  {/* Завершить */}
  <button
    className="bg-emerald-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-emerald-700 shadow-sm"
    onClick={async () => {
      try {
        console.log('✅ Завершить для:', item.userName, item.id);
        
        // ✅ Убрать уведомления перед завершением
        await updateQueueItem(item.id, { returnKeyAlert: false });
        
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
  
  {/* Вернуть в ожидание */}
  <button
    className="bg-purple-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-purple-600 shadow-sm"
    onClick={async () => {
      try {
        console.log('⏳ В ожидание для:', item.userName, item.id);
        
        // ✅ Убрать ВСЕ уведомления
        await updateQueueItem(item.id, { returnKeyAlert: false });
        
        // ✅ Вернуть статус в WAITING
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
  );
}