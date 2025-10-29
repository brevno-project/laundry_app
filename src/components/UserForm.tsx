"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import FullScreenAlert from './FullScreenAlert';

export default function UserForm() {
  const { user, joinQueue, logoutStudent, getUserQueueItem, queue } = useLaundry();
  const [washCount, setWashCount] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<string>('money');
  const [selectedHour, setSelectedHour] = useState<string>('20');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
  
  // Проверка есть ли уже в очереди
  const existingQueueItem = getUserQueueItem();
  const isInQueue = !!existingQueueItem;
  
  // Найти позицию в очереди
  const queuePosition = existingQueueItem ? queue.findIndex(item => item.id === existingQueueItem.id) + 1 : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (user?.name && !isInQueue) {
      // Рассчитать время окончания
      const today = new Date();
      today.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
      const expectedFinishAt = today.toISOString();
      
      console.log('Joining queue with:', user.name, user.room, washCount, paymentType, expectedFinishAt);
      await joinQueue(user.name, user.room, washCount, paymentType, expectedFinishAt);
    }
  };

  const handleLogout = () => {
    logoutStudent();
  };

  // Полноэкранное уведомление когда зовут
  if (existingQueueItem?.status === 'ready') {
    return <FullScreenAlert status={existingQueueItem.status} />;
  }

  return (
    <div className="space-y-4">
      
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Встать в очередь</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-bold mb-2 text-gray-700">
              Имя
            </label>
            <input
              id="name"
              type="text"
              value={user?.name || ''}
              readOnly
              className="mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm p-3 text-gray-700 cursor-not-allowed"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="room" className="block text-sm font-bold mb-2 text-gray-700">
              Комната
            </label>
            <input
              id="room"
              type="text"
              value={user?.room || 'Не указана'}
              readOnly
              className="mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm p-3 text-gray-700 cursor-not-allowed"
            />
          </div>

          {!isInQueue ? (
            <>
              <div className="mb-4">
                <label htmlFor="washCount" className="block text-sm font-bold mb-2 text-gray-700">
                  Количество стирок
                </label>
                <input
                  id="washCount"
                  type="number"
                  min="1"
                  max="10"
                  value={washCount}
                  onChange={(e) => setWashCount(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-gray-500 mt-1">От 1 до 10 стирок</p>
              </div>

              <div className="mb-4">
                <label htmlFor="paymentType" className="block text-sm font-bold mb-2 text-gray-700">
                  Способ оплаты
                </label>
                <select
                  id="paymentType"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="money">💵 Деньги</option>
                  <option value="coupon">🎫 Купон</option>
                  <option value="both">💵+🎫 Купон + Деньги</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-700">
                  До какого времени закончу стирать
                </label>
                <div className="flex gap-3">
                  {/* Часы */}
                  <div className="flex-1">
                    <label htmlFor="hour" className="block text-xs text-gray-600 mb-1">Часы</label>
                    <select
                      id="hour"
                      value={selectedHour}
                      onChange={(e) => {
                        const newHour = e.target.value;
                        setSelectedHour(newHour);
                        // Если 22 часа, сбросить минуты на 00
                        if (newHour === '22') {
                          setSelectedMinute('00');
                        }
                      }}
                      required
                      className="w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 text-lg font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      {Array.from({ length: 23 }, (_, i) => i).map(hour => (
                        <option key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-end pb-3 text-2xl font-bold text-gray-700">:</div>
                  
                  {/* Минуты */}
                  <div className="flex-1">
                    <label htmlFor="minute" className="block text-xs text-gray-600 mb-1">Минуты</label>
                    <select
                      id="minute"
                      value={selectedMinute}
                      onChange={(e) => setSelectedMinute(e.target.value)}
                      required
                      disabled={selectedHour === '22'}
                      className="w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 text-lg font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map(minute => (
                        <option key={minute} value={minute.toString().padStart(2, '0')}>
                          {minute.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-red-600 font-bold mt-2">⚠️ Стирка должна закончиться до 22:00!</p>
                <p className="text-sm text-blue-700 font-bold mt-1">🕒 Выбрано: {selectedHour}:{selectedMinute}</p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md"
              >
                Встать в очередь
              </button>
            </>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-md p-4">
              <p className="text-blue-800 font-bold text-center text-lg">
                ✅ Вы в очереди!
              </p>
              <p className="text-blue-600 font-black text-center mt-2 text-3xl">
                Позиция #{queuePosition}
              </p>

            </div>
          )}
        </form>
      </div>
    </div>
  );
}
