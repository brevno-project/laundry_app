"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import TelegramSetup from './TelegramSetup';

export default function UserForm() {
  const { user, joinQueue, logoutStudent, getUserQueueItem, queue } = useLaundry();
  const [washCount, setWashCount] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<string>('money');
  const [expectedTime, setExpectedTime] = useState<string>('');
  
  // Проверка есть ли уже в очереди
  const existingQueueItem = getUserQueueItem();
  const isInQueue = !!existingQueueItem;
  
  // Найти позицию в очереди
  const queuePosition = existingQueueItem ? queue.findIndex(item => item.id === existingQueueItem.id) + 1 : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (user?.name && !isInQueue) {
      // Валидация времени
      if (!expectedTime) {
        alert('Пожалуйста, укажите время окончания стирки');
        return;
      }
      
      // Рассчитать время окончания
      let expectedFinishAt: string | undefined;
      if (expectedTime) {
        const today = new Date();
        const [hours, minutes] = expectedTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        expectedFinishAt = today.toISOString();
      }
      
      console.log('Joining queue with:', user.name, user.room, washCount, paymentType, expectedFinishAt);
      await joinQueue(user.name, user.room, washCount, paymentType, expectedFinishAt);
    }
  };

  const handleLogout = () => {
    logoutStudent();
  };

  return (
    <div className="space-y-4">
      {/* Telegram Setup - первым делом! */}
      <TelegramSetup />
      
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
                <label htmlFor="expectedTime" className="block text-sm font-bold mb-2 text-gray-700">
До какого времени закончу стирать
                </label>
                <input
                  id="expectedTime"
                  type="time"
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-gray-500 mt-1">Например: 20:00</p>
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
              {existingQueueItem?.status === 'ready' && (
                <div className="mt-3 bg-yellow-100 border-2 border-yellow-500 rounded-lg p-3">
                  <p className="text-yellow-900 font-bold text-center text-lg">
                    🔔 ВАС ЗОВУТ ЗА КЛЮЧОМ!
                  </p>
                  <p className="text-yellow-800 text-sm text-center mt-1">
                    Подойдите в A501
                  </p>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 transition-colors mt-2"
          >
            🚪 Выйти
          </button>
        </form>
      </div>
    </div>
  );
}
