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
    } else {
      setTimeRemaining(null);
    }
  }, [machineState]);

  // Find current washing user
  const currentWashingItem = machineState.currentQueueItemId
    ? queue.find((item) => item.id === machineState.currentQueueItemId)
    : null;

  // Render appropriate status card
  if (machineState.status === MachineStatusEnum.WASHING && currentWashingItem) {
    return (
      <div className="bg-blue-600 p-6 rounded-lg shadow-lg mb-6 border-2 border-blue-700">
        <h2 className="text-2xl font-bold text-white mb-3">🧺 Machine in Use</h2>
        <div className="flex flex-col space-y-2 text-white">
          <p className="text-lg">
            <span className="font-bold">Currently washing:</span> {currentWashingItem.userName}
            {currentWashingItem.userRoom && ` (Room ${currentWashingItem.userRoom})`}
          </p>
          {machineState.startedAt && (
            <p className="text-blue-100">
              <span className="font-semibold">Started at:</span> {formatDate(machineState.startedAt)}
            </p>
          )}
          {machineState.expectedFinishAt && (
            <>
              <p className="text-blue-100">
                <span className="font-semibold">Expected finish:</span>{' '}
                {formatDate(machineState.expectedFinishAt)}
              </p>
              {timeRemaining && (
                <p className="text-2xl font-bold text-yellow-300 mt-2 bg-blue-700 p-3 rounded-md">
                  ⏱️ Time remaining: {timeRemaining}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-600 p-6 rounded-lg shadow-lg mb-6 border-2 border-green-700">
      <h2 className="text-2xl font-bold text-white mb-2">✅ Machine is Free</h2>
      <p className="text-green-100 text-lg">The washing machine is currently available for use.</p>
    </div>
  );
}
