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
      machineState.expectedFinishAt
    ) {
      const intervalId = setInterval(() => {
        const now = new Date();
        const expectedFinish = new Date(machineState.expectedFinishAt!);
        
        if (now >= expectedFinish) {
          setTimeRemaining('Done');
        } else {
          const diffMs = expectedFinish.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          
          setTimeRemaining(`${diffMins}:${diffSecs < 10 ? '0' : ''}${diffSecs}`);
        }
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
    
    // Reset when not washing
    setTimeRemaining(null);
    return undefined;
  }, [machineState]);

  // Find current washing user from queue (not just machineState)
  const currentWashingItem = queue.find((item) => item.status === 'washing');
  
  // Check if machine is actually in use
  const isWashing = !!currentWashingItem;

  // Render appropriate status card
  if (isWashing && currentWashingItem) {
    return (
      <div className="bg-blue-600 p-6 rounded-lg shadow-lg mb-6 border-2 border-blue-700">
        <h2 className="text-2xl font-bold text-white mb-3">🧺 Машина занята</h2>
        <p className="text-blue-100 text-lg mb-2">Сейчас стирает:</p>
        <p className="text-lg">
          <span className="font-bold">Текущий пользователь:</span> {currentWashingItem.userName}
          {currentWashingItem.userRoom && ` (Комната ${currentWashingItem.userRoom})`}
        </p>
        {machineState.startedAt && (
          <p className="text-white text-xl mb-1">
            <strong>Начало:</strong> {formatDate(currentWashingItem.joinedAt)}
          </p>
        )}
        {currentWashingItem.expectedFinishAt && (
          <>
            <p className="text-white text-xl">
              <strong>Предполагаемое окончание:</strong> {formatDate(currentWashingItem.expectedFinishAt)}
            </p>
            {timeRemaining && (
              <p className="text-2xl font-bold text-yellow-300 mt-2 bg-blue-700 p-3 rounded-md">
                <strong>Осталось времени:</strong> {timeRemaining}
              </p>
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
