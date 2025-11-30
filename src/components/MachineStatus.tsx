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
  
  const isWashing = !!currentWashingItem;

  // ✅ Если кто-то стирает - показываем красную карточку
  if (isWashing && currentWashingItem) {
    return (
      <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-8 rounded-2xl shadow-2xl mb-6 border-2 border-red-400 overflow-hidden">
        {/* Анимированный фон */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
        
        {/* Заголовок */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-400 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-red-800 to-red-900 rounded-full p-5 shadow-lg">
              <div className="text-7xl animate-bounce">🟥</div>
            </div>
          </div>
        </div>
        
        <h2 className="relative text-4xl font-black text-white text-center mb-6 drop-shadow-lg tracking-wide">
          🚫 МАШИНА ЗАНЯТА
        </h2>
        
        {/* ✅ Карточка с именем и комнатой */}
        <div className="relative bg-gradient-to-br from-red-800/90 to-red-900/90 backdrop-blur-sm rounded-2xl p-8 mb-6 shadow-2xl border border-red-400/30">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center space-x-4">
              <div className="text-5xl animate-pulse">🧑‍🦼</div>
              <p className="text-white text-4xl font-black drop-shadow-lg">
                {currentWashingItem.full_name}
              </p>
            </div>
            
            {currentWashingItem.room && (
              <div className="flex items-center space-x-3 bg-red-700/50 px-6 py-3 rounded-full">
                <div className="text-3xl">🚪</div>
                <p className="text-red-100 text-2xl font-bold">
                  Комната: <span className="text-yellow-300 font-black">{currentWashingItem.room}</span>
                </p>
              </div>
            )}
          </div>
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
                <div className="mt-6 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-2xl p-6 shadow-xl border-2 border-yellow-500">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-5xl animate-spin" style={{animationDuration: '3s'}}>⏱️</div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1">Осталось времени</div>
                      <div className="text-5xl font-black text-gray-900 drop-shadow-md tabular-nums">{timeRemaining}</div>
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
    <div className="relative bg-gradient-to-br from-green-400 via-green-500 to-green-600 p-8 rounded-2xl shadow-2xl mb-6 border-2 border-green-300 overflow-hidden">
      {/* Анимированный фон */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
      
      <div className="relative flex items-center justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-green-300 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-green-700 to-green-800 rounded-full p-6 shadow-xl">
            <div className="text-8xl animate-bounce" style={{animationDuration: '2s'}}>✅</div>
          </div>
        </div>
      </div>
      
      <h2 className="relative text-5xl font-black text-white text-center mb-4 drop-shadow-2xl tracking-wide">
        🎉 МАШИНА СВОБОДНА
      </h2>
      <div className="relative bg-green-700/50 backdrop-blur-sm rounded-xl p-6 border border-green-300/30">
        <p className="text-green-50 text-2xl text-center font-bold drop-shadow-lg">
          🧴 Стиральная машина сейчас доступна!
        </p>
        <p className="text-green-100 text-lg text-center font-semibold mt-2">
          Можно записаться в очередь
        </p>
      </div>
    </div>
  );
}