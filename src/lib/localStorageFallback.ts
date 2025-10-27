"use client";

import { QueueItem, MachineState, HistoryItem, QueueStatus, MachineStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Local Storage Keys
const QUEUE_KEY = 'laundry-app-queue';
const MACHINE_STATE_KEY = 'laundry-app-machine-state';
const HISTORY_KEY = 'laundry-app-history';

// Get data from local storage
export const getLocalQueue = (): QueueItem[] => {
  try {
    const storedQueue = localStorage.getItem(QUEUE_KEY);
    return storedQueue ? JSON.parse(storedQueue) : [];
  } catch (error) {
    console.error('Error reading queue from localStorage:', error);
    return [];
  }
};

export const getLocalMachineState = (): MachineState => {
  try {
    const storedState = localStorage.getItem(MACHINE_STATE_KEY);
    return storedState 
      ? JSON.parse(storedState) 
      : { status: MachineStatus.IDLE };
  } catch (error) {
    console.error('Error reading machine state from localStorage:', error);
    return { status: MachineStatus.IDLE };
  }
};

export const getLocalHistory = (): HistoryItem[] => {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error('Error reading history from localStorage:', error);
    return [];
  }
};

// Save data to local storage
export const saveLocalQueue = (queue: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving queue to localStorage:', error);
  }
};

export const saveLocalMachineState = (state: MachineState) => {
  try {
    localStorage.setItem(MACHINE_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving machine state to localStorage:', error);
  }
};

export const saveLocalHistory = (history: HistoryItem[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving history to localStorage:', error);
  }
};

// Queue operations
export const addToLocalQueue = (
  user: { id: string; name: string; room?: string },
): QueueItem => {
  const queue = getLocalQueue();
  
  // Check if user is already in queue
  const existingItem = queue.find(
    item => item.userId === user.id && item.status === QueueStatus.QUEUED
  );
  
  if (existingItem) {
    return existingItem;
  }
  
  const newItem: QueueItem = {
    id: uuidv4(),
    userId: user.id,
    userName: user.name,
    userRoom: user.room,
    joinedAt: new Date().toISOString(),
    status: QueueStatus.QUEUED,
  };
  
  queue.push(newItem);
  saveLocalQueue(queue);
  return newItem;
};

export const removeFromLocalQueue = (queueItemId: string, userId: string): boolean => {
  const queue = getLocalQueue();
  const index = queue.findIndex(item => item.id === queueItemId && item.userId === userId);
  
  if (index !== -1) {
    queue.splice(index, 1);
    saveLocalQueue(queue);
    return true;
  }
  
  return false;
};

export const updateLocalQueueItem = (
  queueItemId: string,
  userId: string,
  updates: Partial<QueueItem>
): boolean => {
  const queue = getLocalQueue();
  const item = queue.find(item => item.id === queueItemId && item.userId === userId);
  
  if (item) {
    Object.assign(item, updates);
    saveLocalQueue(queue);
    return true;
  }
  
  return false;
};

// Machine state operations
export const startLocalWashing = (queueItemId: string): void => {
  const queue = getLocalQueue();
  const queueItem = queue.find(item => item.id === queueItemId);
  
  if (queueItem) {
    // Update queue item status
    queueItem.status = QueueStatus.WASHING;
    saveLocalQueue(queue);
    
    // Update machine state
    const machineState: MachineState = {
      status: MachineStatus.WASHING,
      currentQueueItemId: queueItemId,
      startedAt: new Date().toISOString(),
      expectedFinishAt: queueItem.expectedFinishAt,
    };
    
    saveLocalMachineState(machineState);
  }
};

export const markLocalDone = (): HistoryItem | null => {
  const machineState = getLocalMachineState();
  const queue = getLocalQueue();
  
  if (machineState.status !== MachineStatus.WASHING || !machineState.currentQueueItemId) {
    return null;
  }
  
  const currentItem = queue.find(item => item.id === machineState.currentQueueItemId);
  if (!currentItem) {
    return null;
  }
  
  // Add to history
  const historyItem: HistoryItem = {
    id: uuidv4(),
    userId: currentItem.userId,
    userName: currentItem.userName,
    userRoom: currentItem.userRoom,
    startedAt: machineState.startedAt || new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  };
  
  const history = getLocalHistory();
  history.unshift(historyItem); // Add to beginning
  if (history.length > 10) {
    history.pop(); // Limit history size
  }
  saveLocalHistory(history);
  
  // Remove from queue
  const updatedQueue = queue.filter(item => item.id !== machineState.currentQueueItemId);
  saveLocalQueue(updatedQueue);
  
  // Reset machine state
  saveLocalMachineState({ status: MachineStatus.IDLE });
  
  return historyItem;
};

export const startLocalNext = (): boolean => {
  const queue = getLocalQueue();
  const nextItem = queue.find(item => item.status === QueueStatus.QUEUED);
  
  if (nextItem) {
    startLocalWashing(nextItem.id);
    return true;
  }
  
  return false;
};

export const clearLocalQueue = (): void => {
  // Reset machine state
  saveLocalMachineState({ status: MachineStatus.IDLE });
  
  // Clear queue except currently washing
  const queue = getLocalQueue();
  const updatedQueue = queue.filter(item => item.status === QueueStatus.WASHING);
  saveLocalQueue(updatedQueue);
};
