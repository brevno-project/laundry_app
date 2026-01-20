'use client';

import { useLaundry } from '@/contexts/LaundryContext';
import { useUi } from '@/contexts/UiContext';
import { TelegramIcon, CheckIcon, RefreshIcon } from '@/components/Icons';

export default function TelegramSetup() {
  const { user } = useLaundry();
  const { t } = useUi();
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;

  if (!user) return null;

  const link = `https://t.me/${botUsername}?start=${user.student_id}`;

  // --- Подключено ---
  if (user.telegram_chat_id) {
    return (
      <div
        id="telegram-setup"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex items-center gap-2 mb-2">
          <CheckIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
          <h3 className="font-bold text-lg text-emerald-900 dark:text-slate-100">{t("telegram.connected")}</h3>
        </div>

        <p className="text-emerald-800 mb-3 dark:text-slate-300">
          {t("telegram.connectedHint")}
        </p>

        <a
          href={link}
          target="_blank"
          className="flex items-center gap-1 text-blue-700 underline hover:text-blue-900 text-sm font-semibold dark:text-blue-300 dark:hover:text-blue-200"
        >
          <RefreshIcon className="w-4 h-4" />
          {t("telegram.reconnect")}
        </a>
      </div>
    );
  }

  // --- Не подключено ---
  return (
    <div
      id="telegram-setup"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-center gap-2 mb-3">
        <TelegramIcon className="w-8 h-8 text-sky-600 dark:text-sky-300" />
        <h3 className="font-bold text-xl text-amber-950 dark:text-slate-100">{t("telegram.connectTitle")}</h3>
      </div>

      <a
        href={link}
        target="_blank"
        data-focus-target="telegram"
        className="block rounded-xl bg-blue-600 text-white font-bold text-center py-3 shadow-sm hover:bg-blue-700"
      >
        {t("telegram.connectButton")}
      </a>

      <p className="text-xs text-gray-600 mt-3 text-center dark:text-slate-400">
        {t("telegram.connectHint")}
      </p>
    </div>
  );
}
