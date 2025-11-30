'use client';

import { useLaundry } from '@/contexts/LaundryContext';
import { TelegramIcon, CheckIcon } from '@/components/Icons';

export default function TelegramSetup() {
  const { user } = useLaundry();

  if (!user) return null;

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
  const connectLink = `https://t.me/${botUsername}?start=${user.student_id}`;

  if (user.telegram_chat_id) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckIcon className="w-6 h-6 text-green-600" />
          <h3 className="font-bold text-lg text-green-900">Telegram подключен!</h3>
        </div>
        <p className="text-green-800 mb-3">Вы будете получать уведомления.</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <TelegramIcon className="w-8 h-8 text-blue-600" />
        <h3 className="font-bold text-xl text-yellow-900">Подключите Telegram</h3>
      </div>

      <a
        href={connectLink}
        target="_blank"
        className="block bg-blue-600 text-white font-bold text-center py-3 rounded-lg"
      >
        🔗 Подключить Telegram
      </a>

      <p className="text-xs text-gray-600 mt-3 text-center">
        После подключения бот автоматически передаст Chat ID на сайт
      </p>
    </div>
  );
}
