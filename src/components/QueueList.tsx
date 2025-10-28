"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { QueueStatus } from '@/types';
import { formatDate } from '@/contexts/LaundryContext';

export default function QueueList() {
  const { 
    queue, 
    user, 
    leaveQueue, 
    updateQueueItem, 
    startWashing,
    markDone,
    isAdmin 
  } = useLaundry();
  
  // Queue items including washing and done
  const queuedItems = queue.filter(item => 
    item.status === QueueStatus.QUEUED || 
    item.status === QueueStatus.WASHING || 
    item.status === QueueStatus.DONE
  );

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [expectedFinishTime, setExpectedFinishTime] = useState<string>('');

  // Handle start time update
  const handleUpdateFinishTime = (queueItemId: string) => {
    if (!expectedFinishTime) return;

    const isoTime = new Date(expectedFinishTime).toISOString();
    updateQueueItem(queueItemId, { expectedFinishAt: isoTime });
    setEditingItem(null);
    setExpectedFinishTime('');
  };

  if (queuedItems.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">📋 Queue</h2>
        <p className="text-gray-700 text-lg">No one in queue. Join now!</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 overflow-x-auto border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">📋 Queue</h2>
      <table className="min-w-full divide-y-2 divide-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Position
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Joined
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Expected Finish
            </th>
            <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {queuedItems.map((item, index) => {
            const isCurrentUser = user && item.userId === user.id;
            
            const isWashing = item.status === QueueStatus.WASHING;
            const isDone = item.status === QueueStatus.DONE;
            const rowClass = isDone
              ? 'bg-green-100 border-l-4 border-green-600 opacity-75'
              : isWashing 
                ? 'bg-yellow-100 border-l-4 border-yellow-600' 
                : isCurrentUser 
                  ? 'bg-blue-100 border-l-4 border-blue-600' 
                  : 'hover:bg-gray-50';
            
            return (
              <tr key={item.id} className={rowClass}>
                <td className="px-4 py-4 whitespace-nowrap text-base font-bold text-gray-900">
                  {index + 1}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-base font-medium text-gray-800">
                  {isWashing && '🧺 '}
                  {isDone && '✅ '}
                  {item.userName} {item.userRoom && `(Room ${item.userRoom})`}
                  {isWashing && <span className="ml-2 text-xs font-bold text-yellow-700 bg-yellow-200 px-2 py-1 rounded">СТИРАЕТ</span>}
                  {isDone && <span className="ml-2 text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded">ПОСТИРАЛ</span>}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {formatDate(item.joinedAt)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                  {editingItem === item.id ? (
                    <input
                      type="datetime-local"
                      value={expectedFinishTime}
                      onChange={(e) => setExpectedFinishTime(e.target.value)}
                      className="border-2 border-blue-400 rounded p-2 text-sm text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    />
                  ) : (
                    item.expectedFinishAt ? formatDate(item.expectedFinishAt) : '—'
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {isCurrentUser && (
                    <>
                      {editingItem === item.id ? (
                        <button
                          className="text-blue-700 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded"
                          onClick={() => handleUpdateFinishTime(item.id)}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          className="text-blue-700 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded"
                          onClick={() => {
                            setEditingItem(item.id);
                            // Initialize with a default time if not set
                            if (item.expectedFinishAt) {
                              const date = new Date(item.expectedFinishAt);
                              setExpectedFinishTime(
                                new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                                  .toISOString()
                                  .slice(0, 16)
                              );
                            } else {
                              const date = new Date();
                              date.setMinutes(date.getMinutes() + 30); // Default to 30 minutes from now
                              setExpectedFinishTime(
                                new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                                  .toISOString()
                                  .slice(0, 16)
                              );
                            }
                          }}
                        >
                          Set Time
                        </button>
                      )}
                      <button
                        className="text-red-700 font-semibold hover:text-red-900 bg-red-100 px-3 py-1 rounded"
                        onClick={() => leaveQueue(item.id)}
                      >
                        Leave
                      </button>
                    </>
                  )}
                  {isAdmin && !isWashing && (
                    <button
                      className="bg-green-600 text-white font-semibold py-2 px-4 rounded text-sm hover:bg-green-700 shadow-md"
                      onClick={() => startWashing(item.id)}
                    >
                      Start Washing
                    </button>
                  )}
                  {isWashing && isAdmin && (
                    <button
                      className="bg-green-600 text-white font-semibold py-2 px-4 rounded text-sm hover:bg-green-700 shadow-md"
                      onClick={markDone}
                    >
                      ✅ Mark Done
                    </button>
                  )}
                  {isWashing && !isAdmin && (
                    <span className="text-yellow-700 font-bold text-sm">⏳ В процессе...</span>
                  )}
                  {isDone && (
                    <span className="text-green-700 font-bold text-sm">✅ Завершено</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
