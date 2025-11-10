"use client";

import { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { MachineStatus as MachineStatusEnum } from '@/types';
import { formatDate } from '@/contexts/LaundryContext';

export default function MachineStatus() {
  const { machineState, queue } = useLaundry();
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Calculate time remaining for washing machine
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

  // ✅ Найти текущего стирающего из очереди
  const currentWashingItem = queue.find((item) => item.status === 'washing');
  
  const isWashing = !!currentWashingItem;

  if (isWashing && currentWashingItem) {
    return (
      <div className="bg-red-600 p-6 rounded-lg shadow-lg mb-6 border-2 border-red-700">
        <h2 className="text-2xl font-bold text-white mb-3">🔴 Машина занята</h2>
        
        {/* ✅ Имя и комната */}
        <div className="bg-red-700 p-4 rounded-lg mb-3">
          <p className="text-white text-2xl font-bold">
            {currentWashingItem.full_name}
          </p>
          {currentWashingItem.room && (
            <p className="text-red-100 text-xl mt-1">
              🏠 Комната: <span className="font-bold">{currentWashingItem.room}</span>
            </p>
          )}
        </div>
        
        {/* ✅ Время начала */}
        {currentWashingItem.joined_at && (
          <p className="text-white text-lg mb-2">
            <strong>Начало:</strong> {formatDate(currentWashingItem.joined_at)}
          </p>
        )}
        
        {/* ✅ Ожидаемое окончание */}
        {currentWashingItem.expected_finish_at && (
          <>
            <p className="text-white text-lg mb-2">
              <strong>Ожидаемое окончание:</strong> {formatDate(currentWashingItem.expected_finish_at)}
            </p>
            
            {/* ✅ Таймер обратного отсчета */}
            {timeRemaining && (
              <div className="bg-yellow-400 p-4 rounded-lg mt-3">
                <p className="text-2xl font-bold text-gray-900">
                  ⏱️ Осталось: {timeRemaining}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-green-600 p-6 rounded-lg shadow-lg mb-6 border-2 border-green-700">
      <h2 className="text-2xl font-bold text-white mb-2">✅ Машина свободна</h2>
      <p className="text-green-100 text-lg">Стиральная машина сейчас доступна для использования.</p>
    </div>
  );
}