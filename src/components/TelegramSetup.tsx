'use client';

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

export default function TelegramSetup() {
  const { user, linkTelegram } = useLaundry();
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(!user?.telegram_chat_id);

  const handleConnect = async () => {
    if (!chatId.trim()) {
      setError('Введите Chat ID');
      return;
    }

    setLoading(true);
    setError('');

    const result = await linkTelegram(chatId.trim());

    if (result.success) {
      setSuccess(true);
      setShowGuide(false);
      setChatId('');
    } else {
      setError(result.error || 'Ошибка подключения');
    }

    setLoading(false);
  };

  // Если уже подключен
  if (user?.telegram_chat_id && !showGuide) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">✅</span>
          <h3 className="font-bold text-lg text-green-900">Telegram подключен!</h3>
        </div>
        <p className="text-green-800 mb-3">Вы будете получать уведомления в Telegram</p>
        <button
          onClick={() => setShowGuide(true)}
          className="text-sm text-green-700 underline hover:text-green-900"
        >
          Переподключить
        </button>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-3xl">📱</span>
        <h3 className="font-bold text-xl text-yellow-900">Подключите уведомления</h3>
      </div>

      {/* Пошаговая инструкция */}
      <div className="space-y-3 mb-4">
        <div className="bg-white p-3 rounded-lg border border-yellow-300">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white font-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-2">
                <span className="font-bold">Шаг 1:</span> Откройте бота для получения ID:{' '}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-semibold"
                >
                  @userinfobot
                </a>
              </p>
              <p className="text-sm text-gray-600 italic">💡 Chat ID один для всех ботов! Получите здесь, используйте везде.</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-yellow-300">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white font-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-1">
                <span className="font-bold">Шаг 2:</span> Напишите боту <span className="font-semibold">/start</span>
              </p>
              <p className="text-sm text-gray-600">Бот сразу ответит вашим Chat ID</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-yellow-300">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white font-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-1">
                <span className="font-bold">Шаг 3:</span> Скопируйте ваш <span className="font-semibold">Chat ID</span> и вставьте ниже
              </p>
              <p className="text-sm text-gray-600">✅ Уведомления от <span className="font-semibold">@keiin_dorm_laundry_bot</span> будут приходить на этот ID!</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-yellow-300">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white font-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-2">Вставьте Chat ID сюда:</p>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Например: 123456789"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg font-mono text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-3">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-3">
          ✅ Telegram успешно подключен! Теперь вы будете получать уведомления.
        </div>
      )}

      {/* Кнопка */}
      <button
        onClick={handleConnect}
        disabled={loading || !chatId.trim()}
        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg text-lg"
      >
        {loading ? '⏳ Подключение...' : '✅ Подключить уведомления'}
      </button>

      <p className="text-xs text-gray-600 mt-3 text-center">
        💡 Подключите Telegram чтобы получать уведомления о вашей очереди
      </p>
    </div>
  );
}
