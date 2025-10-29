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
        return { bg: 'bg-blue-50', text: 'text-blue-900', badge: '🔑 Начинайте стираться', badgeColor: 'bg-blue-400 text-blue-900' };
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
      
      {/* Статус машины */}
      <div className="p-3 border-b border-gray-200">
        {machineState.status === 'idle' ? (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-lg font-bold text-green-900">Машина свободна</div>
          </div>
        ) : (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 text-center">
            <div className="text-3xl mb-1">🔴</div>
            <div className="text-lg font-bold text-red-900">Машина занята</div>
            {machineState.currentQueueItemId && (() => {
              const currentItem = queue.find(item => item.id === machineState.currentQueueItemId);
              if (currentItem) {
                return (
                  <div className="text-sm text-red-700 mt-1 font-bold">
                    🧑 Стирает: {currentItem.userName}
                  </div>
                );
              }
            })()}
            {machineState.expectedFinishAt && (
              <div className="text-sm text-red-700 mt-1">
                Закончит: {new Date(machineState.expectedFinishAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-2 space-y-3">
        {queuedItems.map((item, index) => {
            const isCurrentUser = user && item.studentId === user.studentId;
            const statusDisplay = getStatusDisplay(item.status);
            
            const rowClass = `${statusDisplay.bg} border-l-4 ${isCurrentUser ? 'border-blue-600' : 'border-gray-300'}`;
            
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
                    
                    {/* Кнопки админа - ВСЕ ОДНОВРЕМЕННО */}
                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Позвать за ключом */}
                        <button
                          className="bg-yellow-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-yellow-600 shadow-sm"
                          onClick={async () => {
                            await setQueueStatus(item.id, QueueStatus.READY);
                            const success = await sendTelegramNotification({
                              type: 'admin_call_for_key',
                              userName: item.userName,
                              userRoom: item.userRoom,
                              studentId: item.studentId,
                              position: index + 1,
                              expectedFinishAt: item.expectedFinishAt
                            });
                            if (success) {
                              alert(`✅ ${item.userName} позван!`);
                            }
                          }}
                        >
                          🔔 Позвать
                        </button>
                        
                        {/* Забрал ключ */}
                        <button
                          className="bg-green-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-green-700 shadow-sm"
                          onClick={async () => {
                            console.log('🔑 Нажата кнопка Забрал для:', item.userName, item.id);
                            await startWashing(item.id);
                            console.log('✅ startWashing завершен');
                            alert(`✅ ${item.userName} забрал ключ и начал стирку!`);
                          }}
                        >
                          🔑 Забрал
                        </button>
                        
                        {/* Вернуть ключ */}
                        <button
                          className="bg-orange-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-orange-600 shadow-sm"
                          onClick={async () => {
                            try {
                              console.log('🔔 Нажата кнопка Вернуть для:', item.userName, item.id);
                              // Установить флаг для полноэкранного уведомления
                              console.log('⚙️ Устанавливаем returnKeyAlert = true');
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
                        
                        {/* Постирался */}
                        <button
                          className="bg-emerald-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-emerald-700 shadow-sm"
                          onClick={() => markDone(item.id)}
                        >
                          ✅ Готово
                        </button>
                        
                        {/* Отменить и вернуть в ожидание */}
                        <button
                          className="bg-gray-500 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-gray-600 shadow-sm"
                          onClick={async () => {
                            try {
                              // Вернуть в ожидание, отменить стирку, убрать уведомления
                              if (item.status === QueueStatus.WASHING) {
                                await cancelWashing(item.id);
                              } else {
                                await setQueueStatus(item.id, QueueStatus.WAITING);
                              }
                              await updateQueueItem(item.id, { returnKeyAlert: false });
                              alert(`✅ ${item.userName} вернулся в ожидание!`);
                            } catch (error) {
                              console.error('Error canceling:', error);
                              alert('❌ Ошибка отмены');
                            }
                          }}
                        >
                          ❌ Отмена
                        </button>
                        
                        {/* Удалить из очереди */}
                        <button
                          className="bg-red-600 text-white font-semibold py-2 px-2 rounded-lg text-xs hover:bg-red-700 shadow-sm col-span-2"
                          onClick={async () => {
                            if (confirm(`Удалить ${item.userName} из очереди?`)) {
                              await removeFromQueue(item.id);
                              alert(`✅ ${item.userName} удален!`);
                            }
                          }}
                        >
                          🗑️ Удалить
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
