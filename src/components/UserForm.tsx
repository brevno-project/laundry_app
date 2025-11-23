"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

export default function UserForm() {
  const { user, joinQueue, logoutStudent, getUserQueueItem, queue, updateQueueItem,students } = useLaundry();
  const [washCount, setWashCount] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<string>('money');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(''); // ✅ Новое поле для выбора даты
  
  const existingQueueItem = getUserQueueItem();
  const isInQueue = !!existingQueueItem;
  
  const queuePosition = existingQueueItem ? queue.findIndex(item => item.id === existingQueueItem.id) + 1 : 0;

  // ✅ Устанавливаем сегодняшнюю дату по умолчанию
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDate(today);
  }, []);

  // ✅ Генерируем доступные даты (сегодня + 7 дней вперед)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      
      // Форматируем дату для отображения
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const dayName = dayNames[date.getDay()];
      const day = date.getDate();
      const month = date.getMonth() + 1;
      
      let label = `${dayName}, ${day}.${month.toString().padStart(2, '0')}`;
      if (i === 0) label += ' (Сегодня)';
      if (i === 1) label += ' (Завтра)';
      
      dates.push({ value: dateStr, label });
    }
    
    return dates;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (user?.full_name && !isInQueue && !isSubmitting) {
      setIsSubmitting(true);
      
      console.log('Joining queue with:', {
        full_name: user.full_name,
        room: user.room,
        washCount,
        paymentType,
        chosenDate: selectedDate // ✅ Передаем выбранную дату
      });
      
      // ✅ Передаем выбранную дату в joinQueue (без expectedFinishAt)
      await joinQueue(user.full_name, user.room, washCount, paymentType, undefined, selectedDate);
      
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    }
  };

  const handleLogout = () => {
    logoutStudent();
  };



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
              value={user?.full_name || ''}
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
              {/* ✅ НОВОЕ ПОЛЕ: Выбор даты */}
              <div className="mb-4">
                <label htmlFor="selectedDate" className="block text-sm font-bold mb-2 text-gray-700">
                  Выберите дату стирки
                </label>
                <select
                  id="selectedDate"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  {getAvailableDates().map(date => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Вы можете записаться на любой день из списка</p>
              </div>

              <div className="mb-4">
                <label htmlFor="washCount" className="block text-sm font-bold mb-2 text-gray-700">
                  Количество стирок
                </label>
                <select
                  id="washCount"
                  value={washCount}
                  onChange={(e) => setWashCount(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
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
                  <option value="money">Деньги</option>
                  <option value="coupon">Купон</option>
                  <option value="both">Купон + Деньги</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Добавление...' : 'Встать в очередь'}
              </button>
            </>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-md p-4">
              <p className="text-blue-800 font-bold text-center text-lg">
                Вы в очереди!
              </p>
              <p className="text-blue-600 font-black text-center mt-2 text-3xl">
                Позиция #{queuePosition}
              </p>
              {/* ✅ Показываем дату записи */}
              {existingQueueItem?.scheduled_for_date && (
                <p className="text-blue-600 text-center mt-2">
                  Записаны на: {new Date(existingQueueItem.scheduled_for_date).toLocaleDateString('ru-RU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric'
                  })}
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}