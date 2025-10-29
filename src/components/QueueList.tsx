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
    startWashing,
    cancelWashing,
    markDone,
    isAdmin 
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

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold p-3 bg-gray-50 rounded-t-lg text-gray-800">📋 Очередь ({queuedItems.length})</h2>
      <div className="p-2 space-y-3">
        {queuedItems.map((item, index) => {
            const isCurrentUser = user && item.studentId === user.studentId;
            const statusDisplay = getStatusDisplay(item.status);
            
            const rowClass = `${statusDisplay.bg} border-l-4 ${isCurrentUser ? 'border-blue-600' : 'border-gray-300'}`;
            
            return (
              <div key={item.id} className={`${statusDisplay.bg} border-l-4 ${isCurrentUser ? 'border-blue-600' : 'border-gray-300'} rounded-lg p-3 shadow`}>
                {/* Заголовок карточки */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-gray-900">#{index + 1}</span>
                    <div>
                      <div className="font-black text-xl text-gray-900">{item.userName}</div>
                      {item.userRoom && <div className="text-sm font-bold text-gray-700">Комната {item.userRoom}</div>}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusDisplay.badgeColor} whitespace-nowrap`}>
                    {statusDisplay.badge}
                  </span>
                </div>
                
                {/* Инфо */}
                <div className="flex gap-4 mb-3 text-base">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-900">Стирок:</span>
                    <span className="text-2xl font-black text-blue-700">{item.washCount || 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-900">Оплата:</span>
                    <span className="font-bold text-gray-900">
                      {item.paymentType === 'coupon' ? '🎫 Купон' : 
                       item.paymentType === 'both' ? '💵+🎫 Оба' : 
                       '💵 Деньги'}
                    </span>
                  </div>
                  {/* Время окончания стирки */}
                  {item.status === QueueStatus.DONE && item.finishedAt ? (
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-gray-900">Закончил в:</span>
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
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-gray-900">Закончит в:</span>
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
                    
                    {/* Кнопки для пользователя */}
                    {isCurrentUser && item.status === QueueStatus.WAITING && (
                      <button
                        className="text-red-700 font-semibold hover:text-red-900 bg-red-100 px-3 py-2 rounded"
                        onClick={() => leaveQueue(item.id)}
                      >
                        ❌ Покинуть очередь
                      </button>
                    )}
                    
                    {/* Кнопки админа */}
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        {/* WAITING → Ключ выдан (автоматически WASHING) */}
                        {item.status === QueueStatus.WAITING && (
                          <button
                            className="bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-blue-700 shadow-lg w-full"
                            onClick={async () => {
                              const success = await sendTelegramNotification({
                                type: 'admin_key_issued',
                                userName: item.userName,
                                userRoom: item.userRoom,
                                studentId: item.studentId,
                                expectedFinishAt: item.expectedFinishAt
                              });
                              // Сразу ставим WASHING
                              await setQueueStatus(item.id, QueueStatus.WASHING);
                              
                              // Уведомить админа
                              if (success) {
                                alert(`✅ Сообщение отправлено ${item.userName}!`);
                              } else {
                                alert(`⚠️ ${item.userName} не подключил Telegram`);
                              }
                            }}
                          >
                            ✅ Ключ выдан
                          </button>
                        )}
                        
                        {/* WASHING → Постирался */}
                        {item.status === QueueStatus.WASHING && (
                          <button
                            className="bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-emerald-700 shadow-lg w-full"
                            onClick={() => markDone(item.id)}
                          >
                            ✅ Постирался
                          </button>
                        )}
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
