"use client";

import { QueueItem, MachineState, HistoryItem, QueueStatus, MachineStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Local Storage Keys
const QUEUE_KEY = 'laundry-app-queue';
const MACHINE_STATE_KEY = 'laundry-app-machine-state';
const HISTORY_KEY = 'laundry-app-history';

// Get data from local storage
export const get_local_queue = (): QueueItem[] => {
  try {
    const storedQueue = localStorage.getItem(QUEUE_KEY);
    return storedQueue ? JSON.parse(storedQueue) : [];
  } catch (error) {
    return [];
  }
};

export const get_local_machine_state = (): MachineState => {
  try {
    const storedState = localStorage.getItem(MACHINE_STATE_KEY);
    return storedState 
      ? JSON.parse(storedState) 
      : { status: MachineStatus.IDLE };
  } catch (error) {
    return { status: MachineStatus.IDLE };
  }
};

export const get_local_history = (): HistoryItem[] => {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    
    return [];
  }
};

// Save data to local storage
export const save_local_queue = (queue: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    
  }
};

export const save_local_machine_state = (state: MachineState) => {
  try {
    localStorage.setItem(MACHINE_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    
  }
};

export const save_local_history = (history: HistoryItem[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    
  }
};

export const add_to_local_queue = (
  user: { id: string; full_name: string; room?: string; student_id?: string },
): QueueItem => {
  const queue = get_local_queue();
  
  // Check if user is already in queue
  const existingItem = queue.find(
    item => item.user_id === user.id && (item.status === QueueStatus.WAITING || item.status === QueueStatus.READY || item.status === QueueStatus.WASHING)
  );
  
  if (existingItem) {
    return existingItem;
  }
  
  // Parse full_name to first_name and last_name
  const nameParts = user.full_name.split(' ');
  const first_name = nameParts[0] || '';
  const last_name = nameParts.slice(1).join(' ') || '';
  
  const newItem: QueueItem = {
    id: uuidv4(),
    user_id: user.id,
    student_id: user.student_id || user.id,
    first_name,
    last_name,
    full_name: user.full_name,
    room: user.room,
    wash_count: 1,
    payment_type: 'money',
    joined_at: new Date().toISOString(),
    expected_finish_at: undefined,
    status: QueueStatus.WAITING,
    scheduled_for_date: new Date().toISOString().slice(0, 10),
    queue_date: new Date().toISOString().slice(0, 10),
    queue_position: queue.length + 1,
  };
  
  queue.push(newItem);
  save_local_queue(queue);
  return newItem;
};

export const remove_from_local_queue = (queueItemId: string, userId: string): boolean => {
  const queue = get_local_queue();
  const index = queue.findIndex(item => item.id === queueItemId && item.user_id === userId);
  
  if (index !== -1) {
    queue.splice(index, 1);
    save_local_queue(queue);
    return true;
  }
  
  return false;
};

export const update_local_queue_item = (
  queueItemId: string,
  userId: string,
  updates: Partial<QueueItem>
): boolean => {
  const queue = get_local_queue();
  const item = queue.find(item => item.id === queueItemId && item.user_id === userId);
  
  if (item) {
    Object.assign(item, updates);
    save_local_queue(queue);
    return true;
  }
  
  return false;
};

// Machine state operations
export const start_local_washing = (queueItemId: string): boolean => {
  const queue = get_local_queue();
  const item = queue.find(item => item.id === queueItemId);
  
  if (!item) return false;
  
  // Update queue item status
  item.status = QueueStatus.WASHING;
  save_local_queue(queue);
  
  // Update machine state
  const machineState: MachineState = {
    status: MachineStatus.WASHING,
    current_queue_item_id: queueItemId,
    started_at: new Date().toISOString(),
    expected_finish_at: item.expected_finish_at,
  };
  
  save_local_machine_state(machineState);
  return true;
};

export const add_to_local_history = (queueItemId: string): boolean => {
  const queue = get_local_queue();
  const machineState = get_local_machine_state();
  
  const currentItem = queue.find(item => item.id === queueItemId);
  if (!currentItem) return false;
  
  // Add to history
  const historyItem: HistoryItem = {
    id: uuidv4(),
    user_id: currentItem.user_id,
    full_name: currentItem.full_name,
    room: currentItem.room,
    started_at: machineState.started_at || new Date().toISOString(),
    finished_at: new Date().toISOString(),
    wash_count: currentItem.wash_count,
    payment_type: currentItem.payment_type,
    washing_started_at: machineState.started_at || new Date().toISOString(),
    washing_finished_at: new Date().toISOString(),
    return_requested_at: new Date().toISOString(),
  };
  
  const history = get_local_history();
  history.push(historyItem);
  save_local_history(history);
  
  // Reset machine state
  const idleMachineState: MachineState = {
    status: MachineStatus.IDLE,
    current_queue_item_id: undefined,
    started_at: undefined,
    expected_finish_at: undefined,
  };
  save_local_machine_state(idleMachineState);
  
  // Remove from queue
  const index = queue.findIndex(item => item.id === queueItemId);
  if (index !== -1) {
    queue.splice(index, 1);
    save_local_queue(queue);
  }
  
  return true;
};

export const mark_local_done = (): HistoryItem | null => {
  const machineState = get_local_machine_state();
  const queue = get_local_queue();
  
  if (machineState.status !== MachineStatus.WASHING || !machineState.current_queue_item_id) {
    return null;
  }
  
  const currentItem = queue.find(item => item.id === machineState.current_queue_item_id);
  if (!currentItem) {
    return null;
  }
  
  // Add to history
  const historyItem: HistoryItem = {
    id: uuidv4(),
    user_id: currentItem.user_id,
    full_name: currentItem.full_name,
    room: currentItem.room,
    started_at: machineState.started_at || new Date().toISOString(),
    finished_at: new Date().toISOString(),
    wash_count: currentItem.wash_count,
    payment_type: currentItem.payment_type,
    washing_started_at: machineState.started_at || new Date().toISOString(),
    washing_finished_at: new Date().toISOString(),
    return_requested_at: new Date().toISOString(),
  };
  
  const history = get_local_history();
  history.unshift(historyItem); // Add to beginning
  if (history.length > 10) {
    history.pop(); // Limit history size
  }
  save_local_history(history);
  
  // Update queue item status to 'done' instead of removing
  currentItem.status = QueueStatus.DONE;
  save_local_queue(queue);
  
  // Reset machine state
  save_local_machine_state({ status: MachineStatus.IDLE });
  
  return historyItem;
};

export const start_local_next = (): boolean => {
  const queue = get_local_queue();
  const nextItem = queue.find(item => item.status === QueueStatus.WAITING || item.status === QueueStatus.READY);
  
  if (nextItem) {
    start_local_washing(nextItem.id);
    return true;
  }
  
  return false;
};

export const clear_local_queue = (): void => {
  // Reset machine state
  save_local_machine_state({ status: MachineStatus.IDLE });
  
  // Clear queue except currently washing
  const queue = get_local_queue();
  const updatedQueue = queue.filter(item => item.status === QueueStatus.WASHING);
  save_local_queue(updatedQueue);
};
