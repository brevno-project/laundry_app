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
                        {/* БЛОК 1: Уведомления (не меняют статус) */}
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <div className="text-xs font-bold text-blue-800 mb-1">📢 Уведомления:</div>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Позвать за ключом */}
                            <button
                              className="bg-yellow-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-yellow-600 shadow-sm"
                              onClick={async () => {
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
                              }}
                            >
                              🔔 Позвать
                            </button>
                            
                            {/* Вернуть ключ */}
                            <button
                              className="bg-orange-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-orange-600 shadow-sm"
                              onClick={async () => {
                                try {
                                  console.log('🔔 Нажата кнопка Вернуть для:', item.userName, item.id);
                                  await updateQueueItem(item.id, { returnKeyAlert: true });
                                  console.log('✅ returnKeyAlert установлен!');
                                  
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
                                  console.error('Error sending notification:', error);
                                  alert('❌ Ошибка отправки уведомления');
                                }
                              }}
                            >
                              🔔 Вернуть
                            </button>
                            
                            {/* Убрать уведомления */}
                            <button
                              className="bg-gray-400 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-gray-500 shadow-sm col-span-2"
                              onClick={async () => {
                                await updateQueueItem(item.id, { returnKeyAlert: false });
                                alert(`✅ Уведомления отменены для ${item.userName}`);
                              }}
                            >
                              🔕 Убрать уведомления
                            </button>
                          </div>
                        </div>

                        {/* БЛОК 2: Изменение статуса */}
                        <div className="bg-purple-50 p-2 rounded border border-purple-200">
                          <div className="text-xs font-bold text-purple-800 mb-1">🎯 Статус:</div>
                          <div className="grid grid-cols-3 gap-1">
                            {/* Ожидает */}
                            <button
                              className={`py-1 px-1 rounded text-xs font-bold ${
                                item.status === QueueStatus.WAITING 
                                  ? 'bg-gray-600 text-white' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              onClick={async () => {
                                if (item.status === QueueStatus.WASHING) {
                                  await cancelWashing(item.id);
                                } else {
                                  await setQueueStatus(item.id, QueueStatus.WAITING);
                                }
                                alert(`${item.userName} → Ожидает`);
                              }}
                            >
                              ⏳
                            </button>
                            
                            {/* Следующий */}
                            <button
                              className={`py-1 px-1 rounded text-xs font-bold ${
                                item.status === QueueStatus.READY 
                                  ? 'bg-yellow-600 text-white' 
                                  : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                              }`}
                              onClick={async () => {
                                await setQueueStatus(item.id, QueueStatus.READY);
                                alert(`${item.userName} → Следующий!`);
                              }}
                            >
                              🟡
                            </button>
                            
                            {/* Ключ выдан */}
                            <button
                              className={`py-1 px-1 rounded text-xs font-bold ${
                                item.status === QueueStatus.KEY_ISSUED 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                              }`}
                              onClick={async () => {
                                await setQueueStatus(item.id, QueueStatus.KEY_ISSUED);
                                alert(`${item.userName} → Ключ выдан`);
                              }}
                            >
                              🔑
                            </button>
                            
                            {/* Стирает */}
                            <button
                              className={`py-1 px-1 rounded text-xs font-bold ${
                                item.status === QueueStatus.WASHING 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-green-200 text-green-800 hover:bg-green-300'
                              }`}
                              onClick={async () => {
                                console.log('🔑 Начать стирку для:', item.userName, item.id);
                                await startWashing(item.id);
                                alert(`${item.userName} → Стирает`);
                              }}
                            >
                              🟢
                            </button>
                            
                            {/* Готово */}
                            <button
                              className={`py-1 px-1 rounded text-xs font-bold col-span-2 ${
                                item.status === QueueStatus.DONE 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300'
                              }`}
                              onClick={async () => {
                                await markDone(item.id);
                                alert(`${item.userName} → Готово!`);
                              }}
                            >
                              ✅ Завершить
                            </button>
                          </div>
                        </div>

                        {/* БЛОК 3: Управление */}
                        <div className="grid grid-cols-1 gap-2">
                          {/* Удалить из очереди */}
                          <button
                            className="bg-red-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-red-700 shadow-sm"
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