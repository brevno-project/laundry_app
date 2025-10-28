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

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [expectedFinishTime, setExpectedFinishTime] = useState<string>('');

  // Handle start time update
  const handleUpdateFinishTime = (queueItemId: string) => {
    if (!expectedFinishTime) return;

    const isoTime = new Date(expectedFinishTime).toISOString();
    updateQueueItem(queueItemId, { expectedFinishAt: isoTime });
    setEditingItem(null);
    setExpectedFinishTime('');
  };

  if (queuedItems.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">📋 Очередь</h2>
        <p className="text-gray-700 text-lg">Никого в очереди. Встаньте первым!</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 overflow-x-auto border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">📋 Очередь</h2>
      <table className="min-w-full divide-y-2 divide-gray-300">
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
                  {item.paymentType === 'coupon' ? '🎫 Купон' : '💵 Деньги'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusDisplay.badgeColor}`}>
                    {statusDisplay.badge}
                  </span>
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {isCurrentUser && (
                    <>
                      {editingItem === item.id ? (
                        <button
                          className="text-blue-700 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded"
                          onClick={() => handleUpdateFinishTime(item.id)}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          className="text-blue-700 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded"
                          onClick={() => {
                            setEditingItem(item.id);
                            // Initialize with a default time if not set
                            if (item.expectedFinishAt) {
                              const date = new Date(item.expectedFinishAt);
                              setExpectedFinishTime(
                                new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                                  .toISOString()
                                  .slice(0, 16)
                              );
                            } else {
                              const date = new Date();
                              date.setMinutes(date.getMinutes() + 30); // Default to 30 minutes from now
                              setExpectedFinishTime(
                                new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                                  .toISOString()
                                  .slice(0, 16)
                              );
                            }
                          }}
                        >
                          Set Time
                        </button>
                      )}
                      <button
                        className="text-red-700 font-semibold hover:text-red-900 bg-red-100 px-3 py-1 rounded"
                        onClick={() => leaveQueue(item.id)}
                      >
                        Покинуть очередь
                      </button>
                    </>
                  )}
                  {isAdmin && item.status === QueueStatus.WAITING && (
                    <button
                      className="bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm hover:bg-blue-700 shadow-md"
                      onClick={() => startWashing(item.id)}
                    >
                      🔑 Выдать ключ
                    </button>
                  )}
                  {item.status === QueueStatus.WASHING && isAdmin && (
                    <div className="flex gap-2">
                      <button
                        className="bg-orange-600 text-white font-semibold py-2 px-3 rounded text-sm hover:bg-orange-700 shadow-md"
                        onClick={() => cancelWashing(item.id)}
                        title="Остановить стирку и вернуть в очередь"
                      >
                        ⏹️ Остановить
                      </button>
                      <button
                        className="bg-green-600 text-white font-semibold py-2 px-3 rounded text-sm hover:bg-green-700 shadow-md"
                        onClick={() => markDone(item.id)}
                        title="Отметить как завершенное"
                      >
                        ✅ Готово
                      </button>
                    </div>
                  )}
                  {item.status === QueueStatus.WASHING && !isAdmin && (
                    <span className="text-green-700 font-bold text-sm">🟢 Стирает...</span>
                  )}
                  {item.status === QueueStatus.DONE && (
                    <span className="text-emerald-700 font-bold text-sm">✅ Готово</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
