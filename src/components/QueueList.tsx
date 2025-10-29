"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { formatDate } from '@/contexts/LaundryContext';

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
        return { bg: 'bg-blue-50', text: 'text-blue-900', badge: '🔑 Ключ выдан', badgeColor: 'bg-blue-400 text-blue-900' };
      case QueueStatus.WASHING:
        return { bg: 'bg-green-50', text: 'text-green-900', badge: '🟢 СТИРАЕТ', badgeColor: 'bg-green-400 text-green-900' };
      case QueueStatus.DONE:
        return { bg: 'bg-emerald-50', text: 'text-emerald-900', badge: '✅ ГОТОВО', badgeColor: 'bg-emerald-400 text-emerald-900' };
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
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              #
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Студент
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Стирок
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Оплата
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Статус
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {queuedItems.map((item, index) => {
            const isCurrentUser = user && item.userId === user.id;
            const statusDisplay = getStatusDisplay(item.status);
            
            const rowClass = `${statusDisplay.bg} border-l-4 ${isCurrentUser ? 'border-blue-600' : 'border-gray-300'}`;
            
            return (
              <tr key={item.id} className={rowClass}>
                <td className="px-4 py-4 whitespace-nowrap text-base font-bold text-gray-900">
                  {index + 1}
                </td>
                <td className="px-4 py-4 text-base font-medium text-gray-900">
                  <div className="font-bold">{item.userName}</div>
                  {item.userRoom && <div className="text-sm text-gray-600">Комната {item.userRoom}</div>}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="text-lg font-bold text-blue-600">{item.washCount || 1}</span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {item.paymentType === 'coupon' ? '🎫 Купон' : 
                   item.paymentType === 'both' ? '💵+🎫 Оба' : 
                   '💵 Деньги'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusDisplay.badgeColor}`}>
                    {statusDisplay.badge}
                  </span>
                </td>

                <td className="px-4 py-4 text-sm font-medium">
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
                        {/* WAITING → Позвать за ключом */}
                        {item.status === QueueStatus.WAITING && (
                          <button
                            className="bg-yellow-500 text-white font-semibold py-2 px-3 rounded text-sm hover:bg-yellow-600 shadow-md"
                            onClick={async () => {
                              await sendAdminMessage(item.id, '🔑 Подойди в A501 за ключом!');
                              await setQueueStatus(item.id, QueueStatus.READY);
                            }}
                          >
                            📢 Позвать за ключом
                          </button>
                        )}
                        
                        {/* READY → Выдать ключ */}
                        {item.status === QueueStatus.READY && (
                          <button
                            className="bg-blue-600 text-white font-semibold py-2 px-3 rounded text-sm hover:bg-blue-700 shadow-md"
                            onClick={async () => {
                              await sendAdminMessage(item.id, '✅ Ключ выдан! Иди к машинке');
                              await setQueueStatus(item.id, QueueStatus.KEY_ISSUED);
                            }}
                          >
                            🔑 Выдать ключ
                          </button>
                        )}
                        
                        {/* KEY_ISSUED → Начать стирку */}
                        {item.status === QueueStatus.KEY_ISSUED && (
                          <button
                            className="bg-green-600 text-white font-semibold py-2 px-3 rounded text-sm hover:bg-green-700 shadow-md"
                            onClick={() => startWashing(item.id)}
                          >
                            ▶️ Начать стирку
                          </button>
                        )}
                        
                        {/* WASHING → Принеси ключ + Готово + Остановить */}
                        {item.status === QueueStatus.WASHING && (
                          <>
                            <button
                              className="bg-yellow-500 text-white font-semibold py-2 px-3 rounded text-sm hover:bg-yellow-600 shadow-md"
                              onClick={() => sendAdminMessage(item.id, '⏰ Принеси ключ обратно в A501!')}
                            >
                              📢 Принеси ключ
                            </button>
                            <button
                              className="bg-emerald-600 text-white font-semibold py-2 px-3 rounded text-sm hover:bg-emerald-700 shadow-md"
                              onClick={() => markDone(item.id)}
                            >
                              ✅ Готово
                            </button>
                            <button
                              className="bg-orange-600 text-white font-semibold py-2 px-3 rounded text-sm hover:bg-orange-700 shadow-md"
                              onClick={() => cancelWashing(item.id)}
                            >
                              ⏹️ Остановить
                            </button>
                          </>
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
