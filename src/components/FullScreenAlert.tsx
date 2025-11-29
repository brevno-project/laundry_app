'use client';

import { QueueStatus } from '@/types';
import { MoneyIcon, BellIcon } from '@/components/Icons';

interface FullScreenAlertProps {
  status: QueueStatus;
  needsToReturnKey?: boolean;
  adminRoom?: string;  // ✅ ДОБАВЛЕНО: комната админа
  onClose?: () => void;
}

export default function FullScreenAlert({ status, needsToReturnKey, adminRoom, onClose }: FullScreenAlertProps) {
  // ✅ ПРИОРИТЕТ 1: "Принеси ключ" - показывается ВСЕГДА если флаг установлен ИЛИ статус RETURNING_KEY
  if (needsToReturnKey || status === QueueStatus.RETURNING_KEY) {
    return (
      <div className="fixed inset-0 bg-orange-500 z-50 flex items-center justify-center p-4 animate-pulse">
        <div className="text-center">
          <BellIcon className="w-40 h-40 mx-auto mb-8 text-orange-900" />
          <h1 className="text-6xl font-black text-orange-900 mb-4">
            ПРИНЕСИТЕ КЛЮЧ!
          </h1>
          <p className="text-4xl font-bold text-orange-800 mb-8">
            {/* ✅ ИСПРАВЛЕНО: Используем adminRoom */}
            Верните ключ в {adminRoom || 'A501'}
          </p>
          <p className="text-2xl font-semibold text-orange-700">
            ⚡ Как можно скорее!
          </p>
        </div>
      </div>
    );
  }

  // ✅ ПРИОРИТЕТ 2: "Вас зовут" - показывается только если НЕТ "Принеси ключ"
  if (status === QueueStatus.READY) {
    return (
      <div className="fixed inset-0 bg-yellow-400 z-50 flex items-center justify-center p-4 animate-pulse">
        <div className="text-center">
          <BellIcon className="w-40 h-40 mx-auto mb-8 text-yellow-900" />
          <h1 className="text-6xl font-black text-yellow-900 mb-4">
            ВАС ЗОВУТ!
          </h1>
          <p className="text-4xl font-bold text-yellow-800 mb-8">
            {/* ✅ ИСПРАВЛЕНО: Используем adminRoom */}
            Подойдите в {adminRoom || 'A501'} за ключом
          </p>
          <p className="text-2xl font-semibold text-yellow-700 flex items-center justify-center gap-2">
            <MoneyIcon className="w-8 h-8" />Возьмите деньги/купон
          </p>
        </div>
      </div>
    );
  }

  return null;
}