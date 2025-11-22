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
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-2xl relative border border-gray-700">
        {/* Кнопка закрыть */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
          title="Закрыть"
        >
          ×
        </button>

        {/* Заголовок */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            📱 Подключите Telegram
          </h2>
          <p className="text-gray-400 text-sm">
            Получайте уведомления когда вас позовут
          </p>
        </div>

        {/* Инструкция */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 text-sm">
          <ol className="space-y-2 text-gray-300">
            <li>1. Найдите <span className="text-blue-400 font-semibold">@LaundryNotifyBot</span> в Telegram</li>
            <li>2. Нажмите <span className="text-blue-400 font-semibold">/start</span></li>
            <li>3. Скопируйте Chat ID из сообщения</li>
          </ol>
        </div>

        {/* Поле ввода */}
        <div className="space-y-3">
          <div>
            <label className="block text-gray-300 font-semibold mb-2 text-sm">
              Chat ID:
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => {
                setChatId(e.target.value);
                setError('');
              }}
              placeholder="123456789"
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 p-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Позже
            </button>
            <button
              onClick={handleConnect}
              disabled={loading || !chatId.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Подключение...' : 'Подключить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
