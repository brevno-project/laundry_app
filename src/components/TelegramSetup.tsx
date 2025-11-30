'use client';

import { useLaundry } from '@/contexts/LaundryContext';
import { TelegramIcon, CheckIcon, RefreshIcon } from '@/components/Icons';

export default function TelegramSetup() {
  const { user } = useLaundry();
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;

  if (!user) return null;

  const link = `https://t.me/${botUsername}?start=${user.student_id}`;

  // --- Подключено ---
  if (user.telegram_chat_id) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckIcon className="w-6 h-6 text-green-600" />
          <h3 className="font-bold text-lg text-green-900">Telegram подключён</h3>
        </div>

        <p className="text-green-800 mb-3">
          Уведомления будут приходить в Telegram.
        </p>

        <a
          href={link}
          target="_blank"
          className="flex items-center gap-1 text-blue-600 underline hover:text-blue-800 text-sm font-semibold"
        >
          <RefreshIcon className="w-4 h-4" />
          Переподключить другой Telegram
        </a>
      </div>
    );
  }

  // --- Не подключено ---
  return (
    <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <TelegramIcon className="w-8 h-8 text-blue-600" />
        <h3 className="font-bold text-xl text-yellow-900">Подключите Telegram</h3>
      </div>

      <a
        href={link}
        target="_blank"
        className="block bg-blue-600 text-white font-bold text-center py-3 rounded-lg"
      >
        Подключить Telegram
      </a>

      <p className="text-xs text-gray-600 mt-3 text-center">
        После подключения бот автоматически привяжет ваш Telegram
      </p>
    </div>
  );
}
