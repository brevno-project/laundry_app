"use client";

import { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

interface TelegramBannerProps {
  onGoToSettings: () => void;
}

/**
 * Полноэкранный баннер для подключения Telegram
 * Показывается при входе для пользователей без Telegram (не админов)
 */
export default function TelegramBanner({ onGoToSettings }: TelegramBannerProps) {
  const { user, isAdmin } = useLaundry();
  const [dismissed, setDismissed] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Отслеживаем изменения user - показываем баннер при входе
  useEffect(() => {
    if (user && !user.telegram_chat_id && !isAdmin) {
      setShouldShow(true);
      setDismissed(false); // Сбрасываем dismissed при новом входе
    } else {
      setShouldShow(false);
    }
  }, [user, isAdmin]);

  // Не показываем если:
  // - Пользователь не вошел
  // - Telegram уже подключен
  // - Пользователь - админ
  // - Баннер закрыт кнопкой "Позже"
  if (!shouldShow || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleGoToSettings = () => {
    setDismissed(true);
    onGoToSettings();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-2xl relative border border-gray-700">


        {/* Заголовок */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Подключите Telegram
          </h2>
          <p className="text-gray-400">
            Получайте уведомления когда вас позовут за ключом
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Позже
          </button>
          <button
            onClick={handleGoToSettings}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Перейти в настройки
          </button>
        </div>
      </div>
    </div>
  );
}
