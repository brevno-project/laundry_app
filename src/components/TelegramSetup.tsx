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
        className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
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
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-center gap-2 mb-3">
        <TelegramIcon className="w-8 h-8 text-blue-600 dark:text-blue-300" />
        <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">{t("telegram.connectTitle")}</h3>
      </div>

      <div className="relative">
        <div aria-hidden className="telegram-aura" />
        <div aria-hidden className="telegram-aura telegram-aura-secondary" />
        <a
          href={link}
          target="_blank"
          data-focus-target="telegram"
          className="telegram-pulse relative block rounded-xl bg-blue-600 text-white font-bold text-center py-3 shadow-lg shadow-blue-500/25 hover:bg-blue-700 ring-2 ring-blue-500/35 dark:ring-blue-400/35"
        >
          {t("telegram.connectButton")}
        </a>
      </div>

      <p className="text-xs text-gray-600 mt-3 text-center dark:text-slate-400">
        {t("telegram.connectHint")}
      </p>
    </div>
  );
}
