"use client";

import { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { MachineStatus as MachineStatusEnum, QueueStatus } from '@/types';
import { formatDate } from '@/contexts/LaundryContext';

export default function MachineStatus() {
  const { machineState, queue } = useLaundry();
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // ✅ Таймер обратного отсчета
  useEffect(() => {
    if (
      machineState.status === MachineStatusEnum.WASHING &&
      machineState.expected_finish_at
    ) {
      const intervalId = setInterval(() => {
        const now = new Date();
        const expectedFinish = new Date(machineState.expected_finish_at!);
        
        if (now >= expectedFinish) {
          setTimeRemaining('Завершено');
        } else {
          const diffMs = expectedFinish.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          
          setTimeRemaining(`${diffMins}:${diffSecs < 10 ? '0' : ''}${diffSecs}`);
        }
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
    
    setTimeRemaining(null);
    return undefined;
  }, [machineState]);

  // ✅ КРИТИЧНО: Ищем того, кто стирает
  const currentWashingItem = queue.find((item) => item.status === QueueStatus.WASHING);
  
  console.log('🔍 MachineStatus: Looking for washing item');
  console.log('📊 Queue:', queue);
  console.log('👤 Current washing item:', currentWashingItem);
  console.log('🎰 Machine state:', machineState);

  const isWashing = !!currentWashingItem;

  // ✅ Если кто-то стирает - показываем красную карточку
  if (isWashing && currentWashingItem) {
    return (
      <div className="bg-red-600 p-6 rounded-lg shadow-2xl mb-6 border-4 border-red-800">
        {/* Заголовок */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-red-800 rounded-full p-4 animate-pulse">
            <div className="text-6xl">🔴</div>
          </div>
        </div>
        
        <h2 className="text-3xl font-black text-white text-center mb-6">
          МАШИНА ЗАНЯТА
        </h2>
        
        {/* ✅ Карточка с именем и комнатой */}
        <div className="bg-red-800 rounded-xl p-6 mb-4 shadow-inner">
          <div className="flex items-center justify-center mb-2">
            <div className="text-4xl mr-3">😊</div>
            <p className="text-white text-3xl font-black">
              {currentWashingItem.full_name}
            </p>
          </div>
          
          {currentWashingItem.room && (
            <div className="flex items-center justify-center mt-3">
              <div className="text-3xl mr-2">🏠</div>
              <p className="text-red-200 text-2xl font-bold">
                Комната: <span className="text-yellow-300">{currentWashingItem.room}</span>
              </p>
            </div>
          )}
        </div>
        
        {/* ✅ Информация о времени */}
        <div className="space-y-3 bg-red-700 rounded-xl p-4">
          {currentWashingItem.joined_at && (
            <div className="flex items-center justify-between">
              <span className="text-red-200 text-lg font-semibold">⏰ Начало:</span>
              <span className="text-white text-lg font-bold">
                {formatDate(currentWashingItem.joined_at)}
              </span>
            </div>
          )}
          
          {currentWashingItem.expected_finish_at && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-red-200 text-lg font-semibold">🏁 Окончание:</span>
                <span className="text-white text-lg font-bold">
                  {formatDate(currentWashingItem.expected_finish_at)}
                </span>
              </div>
              
              {/* ✅ Таймер */}
              {timeRemaining && (
                <div className="mt-4 bg-yellow-400 rounded-lg p-4">
                  <div className="flex items-center justify-center">
                    <div className="text-3xl mr-2">⏱️</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">Осталось времени:</div>
                      <div className="text-3xl font-black text-gray-900">{timeRemaining}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ✅ Если никто не стирает - показываем зеленую карточку
  return (
    <div className="bg-green-600 p-6 rounded-lg shadow-2xl mb-6 border-4 border-green-800">
      <div className="flex items-center justify-center mb-4">
        <div className="bg-green-800 rounded-full p-4">
          <div className="text-6xl">✅</div>
        </div>
      </div>
      
      <h2 className="text-3xl font-black text-white text-center mb-3">
        МАШИНА СВОБОДНА
      </h2>
      <p className="text-green-100 text-xl text-center font-semibold">
        Стиральная машина сейчас доступна для использования
      </p>
    </div>
  );
}