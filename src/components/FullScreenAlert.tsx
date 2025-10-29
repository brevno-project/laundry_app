'use client';

import { QueueStatus } from '@/types';

interface FullScreenAlertProps {
  status: QueueStatus;
  needsToReturnKey?: boolean;
  onClose?: () => void;
}

export default function FullScreenAlert({ status, needsToReturnKey, onClose }: FullScreenAlertProps) {
  if (status === QueueStatus.READY) {
    return (
      <div className="fixed inset-0 bg-yellow-400 z-50 flex items-center justify-center p-4 animate-pulse">
        <div className="text-center">
          <div className="text-9xl mb-8">🔔</div>
          <h1 className="text-6xl font-black text-yellow-900 mb-4">
            ВАС ЗОВУТ!
          </h1>
          <p className="text-4xl font-bold text-yellow-800 mb-8">
            Подойдите в A501 за ключом
          </p>
          <p className="text-2xl font-semibold text-yellow-700">
            💵 Возьмите деньги/купон
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-12 bg-white text-yellow-900 font-bold py-4 px-8 rounded-full text-xl shadow-2xl hover:bg-yellow-50"
            >
              Понятно
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === QueueStatus.WASHING && needsToReturnKey) {
    return (
      <div className="fixed inset-0 bg-orange-500 z-50 flex items-center justify-center p-4 animate-pulse">
        <div className="text-center">
          <div className="text-9xl mb-8">🔔</div>
          <h1 className="text-6xl font-black text-orange-900 mb-4">
            ПРИНЕСИТЕ КЛЮЧ!
          </h1>
          <p className="text-4xl font-bold text-orange-800 mb-8">
            Верните ключ в A501
          </p>
          <p className="text-2xl font-semibold text-orange-700">
            ⚡ Как можно скорее!
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-12 bg-white text-orange-900 font-bold py-4 px-8 rounded-full text-xl shadow-2xl hover:bg-orange-50"
            >
              Понятно
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
