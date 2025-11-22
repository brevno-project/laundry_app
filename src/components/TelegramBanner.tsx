"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

/**
 * Полноэкранный баннер для подключения Telegram
 * Показывается при входе для всех пользователей без Telegram
 */
export default function TelegramBanner() {
  const { user, linkTelegram } = useLaundry();
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Не показываем если Telegram уже подключен или баннер закрыт
  if (!user || user.telegram_chat_id || dismissed) {
    return null;
  }

  const handleConnect = async () => {
    if (!chatId.trim()) {
      setError('Введите Chat ID');
      return;
    }

    setLoading(true);
    setError('');

    const result = await linkTelegram(chatId.trim());

    if (result.success) {
      alert('✅ Telegram успешно подключен!');
      setDismissed(true);
    } else {
      setError(result.error || 'Ошибка подключения');
    }

    setLoading(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative animate-pulse-slow">
        {/* Кнопка закрыть */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white hover:text-gray-200 text-3xl font-bold"
          title="Закрыть (можно подключить позже)"
        >
          ×
        </button>

        {/* Иконка */}
        <div className="text-center mb-6">
          <div className="text-8xl mb-4">📱</div>
          <h2 className="text-4xl font-black text-white mb-2">
            Подключите уведомления!
          </h2>
          <p className="text-xl text-blue-100">
            Получайте уведомления когда вас позовут за ключом
          </p>
        </div>

        {/* Инструкция */}
        <div className="bg-white bg-opacity-20 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-3">📋 Как подключить:</h3>
          <ol className="space-y-2 text-white">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Откройте Telegram и найдите бота <span className="font-bold bg-white bg-opacity-30 px-2 py-1 rounded">@LaundryNotifyBot</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Нажмите <span className="font-bold">/start</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Скопируйте ваш Chat ID из сообщения бота</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Вставьте Chat ID ниже и нажмите "Подключить"</span>
            </li>
          </ol>
        </div>

        {/* Поле ввода */}
        <div className="space-y-4">
          <div>
            <label className="block text-white font-bold mb-2 text-lg">
              Ваш Telegram Chat ID:
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => {
                setChatId(e.target.value);
                setError('');
              }}
              placeholder="Например: 123456789"
              className="w-full p-4 rounded-lg text-gray-900 text-lg font-semibold border-4 border-white focus:border-yellow-300 focus:outline-none"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-500 text-white p-3 rounded-lg font-semibold">
              ❌ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
            >
              Позже
            </button>
            <button
              onClick={handleConnect}
              disabled={loading || !chatId.trim()}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 px-6 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Подключение...' : '✅ Подключить'}
            </button>
          </div>
        </div>

        {/* Подсказка */}
        <p className="text-center text-blue-100 text-sm mt-4">
          💡 Вы можете подключить Telegram позже в настройках
        </p>
      </div>
    </div>
  );
}
