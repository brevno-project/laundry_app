"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

export default function UserForm() {
  const { user, joinQueue, logoutStudent, getUserQueueItem } = useLaundry();
  const [washCount, setWashCount] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<string>('money');
  
  // Проверка есть ли уже в очереди
  const existingQueueItem = getUserQueueItem();
  const isInQueue = !!existingQueueItem;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (user?.name && !isInQueue) {
      console.log('Joining queue with:', user.name, user.room, washCount, paymentType);
      await joinQueue(user.name, user.room, washCount, paymentType);
    }
  };

  const handleLogout = () => {
    logoutStudent();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
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
              <select
                id="washCount"
                value={washCount}
                onChange={(e) => setWashCount(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="1">1 стирка</option>
                <option value="2">2 стирки</option>
                <option value="3">3 стирки</option>
              </select>
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
              </select>
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
            <p className="text-blue-800 font-bold text-center">
              ✅ Вы уже в очереди!
            </p>
            <p className="text-blue-600 text-sm text-center mt-2">
              Позиция #{existingQueueItem?.id || '?'}
            </p>
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
  );
}
