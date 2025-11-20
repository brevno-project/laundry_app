"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import FullScreenAlert from './FullScreenAlert';

export default function UserForm() {
  const { user, joinQueue, logoutStudent, getUserQueueItem, queue, updateQueueItem,students } = useLaundry();
  const [washCount, setWashCount] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<string>('money');
  const [selectedHour, setSelectedHour] = useState<string>('20');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
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
      
      const today = new Date();
      today.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
      const expectedFinishAt = today.toISOString();
      
      console.log('Joining queue with:', {
        full_name: user.full_name,
        room: user.room,
        washCount,
        paymentType,
        expectedFinishAt,
        chosenDate: selectedDate // ✅ Передаем выбранную дату
      });
      
      // ✅ Передаем выбранную дату в joinQueue
      await joinQueue(user.full_name, user.room, washCount, paymentType, expectedFinishAt, selectedDate);
      
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    }
  };

  const handleLogout = () => {
    logoutStudent();
  };

  // ✅ Получаем комнату админа из базы
  const getAdminRoom = () => {
    return existingQueueItem?.admin_room || 'A501';
  };

  // Полноэкранное уведомление когда зовут
  if (existingQueueItem?.status === 'ready') {
    return <FullScreenAlert status={existingQueueItem.status} adminRoom={getAdminRoom()} />;
  }

  // Полноэкранное уведомление "Принеси ключ" - БЕЗ кнопки закрытия
  if (existingQueueItem?.return_key_alert) {
    return (
      <FullScreenAlert 
        status={existingQueueItem.status} 
        needsToReturnKey={true}
        adminRoom={getAdminRoom()}
      />
    );
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
                  📅 Выберите дату стирки
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
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Добавление...' : 'Встать в очередь'}
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
              {/* ✅ Показываем дату записи */}
              {existingQueueItem?.scheduled_for_date && (
                <p className="text-blue-600 text-center mt-2">
                  📅 Записаны на: {new Date(existingQueueItem.scheduled_for_date).toLocaleDateString('ru-RU', {
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